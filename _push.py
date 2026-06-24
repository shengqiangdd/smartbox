#!/usr/bin/env python3
"""
GitHub 推送脚本 - 使用 GitHub Git Data API 将本地代码推送到 shengqiangdd/smartbox
用法: python3 _push.py <GITHUB_TOKEN> [commit_message]
"""

import os
import sys
import json
import base64
import mimetypes
import urllib.request
import urllib.error

REPO = "shengqiangdd/smartbox"
API = f"https://api.github.com/repos/{REPO}/git"
GITIGNORE_PATTERNS = [
    'node_modules/', '.nodeenv/', 'dist/', 'build/', 'out/',
    '.env', '.env.local', '.DS_Store', 'Thumbs.db',
    '.vscode/', '.idea/', '*.swp', '*.swo', '*~',
    'npm-debug.log*', 'yarn-debug.log*', 'yarn-error.log*',
    '*.log',
]

REPO_PATH = os.path.dirname(os.path.abspath(__file__))
IGNORE_DIRS = {'node_modules', '.nodeenv', 'dist', 'build', 'out', '.git', '__pycache__'}

def should_ignore(name, rel_path):
    """检查文件是否应被忽略"""
    if name.startswith('.'):
        return True
    for p in GITIGNORE_PATTERNS:
        pat = p.rstrip('/')
        if rel_path == pat or rel_path.startswith(pat + '/'):
            return True
    return False

def get_all_files():
    """获取所有要跟踪的文件"""
    files = []
    for root, dirs, fnames in os.walk(REPO_PATH):
        # 跳过忽略目录
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        rel_root = os.path.relpath(root, REPO_PATH)
        if rel_root == '.':
            rel_root = ''
        for fname in fnames:
            rel_path = os.path.join(rel_root, fname) if rel_root else fname
            if should_ignore(fname, rel_path):
                continue
            files.append(rel_path)
    return sorted(files)

def api_request(method, url, token, data=None):
    """GitHub API 请求"""
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "smartbox-push-script",
    }
    if data is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(data).encode('utf-8')
    else:
        body = None

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8') if e.fp else ''
        print(f"❌ HTTP {e.code}: {err_body[:200]}")
        sys.exit(1)

def get_file_mode(filepath):
    """获取文件的 git 模式"""
    full_path = os.path.join(REPO_PATH, filepath)
    st = os.stat(full_path)
    # 可执行文件用 100755，否则 100644
    if st.st_mode & 0o111:
        return "100755"
    return "100644"

def main():
    if len(sys.argv) < 2:
        print("用法: python3 _push.py <GITHUB_TOKEN> [commit_message]")
        sys.exit(1)

    token = sys.argv[1]
    commit_msg = sys.argv[2] if len(sys.argv) > 2 else "fix: SFTP file operations - add requestId to all sftp-result responses & fix path concatenation"

    print("📦 收集文件...")
    files = get_all_files()
    print(f"   共 {len(files)} 个文件")

    # 1. 获取最新 commit
    print("\n🔍 获取最新 commit...")
    ref_data = api_request("GET", f"{API}/refs/heads/main", token)
    latest_commit_sha = ref_data["object"]["sha"]
    print(f"   最新 commit: {latest_commit_sha[:12]}")

    commit_data = api_request("GET", f"{API}/commits/{latest_commit_sha}", token)
    base_tree_sha = commit_data["tree"]["sha"]
    print(f"   基础 tree: {base_tree_sha[:12]}")

    # 2. 创建 blobs 和 tree entries
    print("\n📝 创建 blobs...")
    tree_entries = []
    total = len(files)
    for i, filepath in enumerate(files):
        full_path = os.path.join(REPO_PATH, filepath)
        if not os.path.isfile(full_path):
            continue

        with open(full_path, 'rb') as f:
            content = f.read()

        # 小文件直接 base64 编码创建 blob
        content_b64 = base64.b64encode(content).decode('utf-8')

        # 创建 blob
        blob_data = {
            "content": content_b64,
            "encoding": "base64",
        }
        blob_resp = api_request("POST", f"{API}/blobs", token, blob_data)
        blob_sha = blob_resp["sha"]

        mode = get_file_mode(filepath)
        tree_entries.append({
            "path": filepath,
            "mode": mode,
            "type": "blob",
            "sha": blob_sha,
        })

        if (i + 1) % 20 == 0:
            print(f"   {i+1}/{total}")

    print(f"   共创建 {total} 个 blob")

    # 3. 创建 tree
    print("\n🌳 创建 tree...")
    tree_data = {
        "base_tree": base_tree_sha,
        "tree": tree_entries,
    }
    tree_resp = api_request("POST", f"{API}/trees", token, tree_data)
    new_tree_sha = tree_resp["sha"]
    print(f"   新 tree: {new_tree_sha[:12]}")

    # 4. 创建 commit
    print("\n✅ 创建 commit...")
    commit_data = {
        "message": commit_msg,
        "author": {
            "name": "SmartBox Bot",
            "email": "bot@smartbox.dev",
        },
        "parents": [latest_commit_sha],
        "tree": new_tree_sha,
    }
    commit_resp = api_request("POST", f"{API}/commits", token, commit_data)
    new_commit_sha = commit_resp["sha"]
    print(f"   新 commit: {new_commit_sha[:12]}")

    # 5. 更新 ref
    print("\n🚀 推送到 main...")
    ref_update = {
        "sha": new_commit_sha,
        "force": False,
    }
    api_request("PATCH", f"{API}/refs/heads/main", token, ref_update)
    print("   ✅ 推送成功！")

    # 6. 更新本地 .git 记录
    git_head = os.path.join(REPO_PATH, '.git', 'refs', 'heads', 'main')
    os.makedirs(os.path.dirname(git_head), exist_ok=True)
    with open(git_head, 'w') as f:
        f.write(new_commit_sha + '\n')
    print(f"   📝 本地 ref 已更新: {new_commit_sha[:12]}")

    print(f"\n🎉 完成！https://github.com/{REPO}/commit/{new_commit_sha}")

if __name__ == "__main__":
    main()
