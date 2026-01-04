# Git 常用命令速查表

## 🔥 最常用的命令（90% 的时间只用这些）

### 查看状态
```bash
git status
```
**作用：** 查看哪些文件被修改了，哪些还没提交
**使用场景：** 每次开始工作前、准备提交前

### 提交代码（三步走）
```bash
# 1. 查看改了什么
git status

# 2. 添加要提交的文件
git add .                    # 添加所有修改
git add 文件名.ts            # 只添加某个文件

# 3. 提交并写说明
git commit -m "这里写改动说明"
```

### 推送到远程
```bash
git push
```
**作用：** 把本地提交推送到 GitHub

### 拉取最新代码
```bash
git pull
```
**作用：** 从 GitHub 拉取别人的最新修改

---

## 📋 分支管理

### 查看分支
```bash
git branch                    # 查看本地分支
git branch -a                 # 查看所有分支（包括远程）
git branch -r                 # 只查看远程分支
```

### 创建分支
```bash
git branch 新分支名称         # 创建但不切换
git checkout -b 新分支名称    # 创建并切换到新分支
```

### 切换分支
```bash
git checkout 分支名称         # 切换到已有分支
git switch 分支名称           # 新写法（效果一样）
```

### 删除分支
```bash
git branch -D 分支名称        # 删除本地分支
git push origin --delete 分支名称  # 删除远程分支
```

---

## 🕰️ 查看历史

### 查看提交记录
```bash
git log                       # 详细历史
git log --oneline             # 简洁版（每行一条）
git log --graph --oneline     # 图形化显示
```

### 查看某次提交改了什么
```bash
git show 提交ID              # 查看某次提交的详情
```

---

## ↩️ 撤销操作

### 撤销工作区的修改
```bash
git restore 文件名            # 撤销某个文件的修改
git restore .                 # 撤销所有修改（危险！）
```

### 撤销暂存区的文件
```bash
git restore --staged 文件名   # 从暂存区移除，但保留修改
```

### 撤销最近一次提交
```bash
git reset --soft HEAD~1       # 撤销提交，保留修改在暂存区
git reset --hard HEAD~1       # 撤销提交，丢弃所有修改（危险！）
```

---

## 🔄 合并与冲突

### 合并分支
```bash
git merge 要合并的分支        # 把另一个分支合并到当前分支
```

### 解决冲突步骤
1. `git status` 查看哪些文件有冲突
2. 打开冲突文件，找到 `<<<<<<<` 标记
3. 手动选择保留哪些代码
4. `git add 解决冲突的文件`
5. `git commit` 完成合并

---

## 💡 实用技巧

### 查看文件改动
```bash
git diff                      # 查看工作区的改动
git diff --staged             # 查看暂存区的改动
```

### 临时保存工作
```bash
git stash                     # 临时保存当前修改
git stash pop                 # 恢复刚才保存的修改
```

### 查看远程仓库
```bash
git remote -v                 # 查看远程仓库地址
```

---

## 📝 提交信息规范

好的提交信息应该：
```bash
# ✅ 好的提交信息
git commit -m "添加用户登录功能"
git commit -m "修复首页样式问题"
git commit -m "更新 README 文档"

# ❌ 不好的提交信息
git commit -m "更新"
git commit -m "fix"
git commit -m "asdf"
```

---

## 🚨 常见错误处理

### push 失败（远程有新提交）
```bash
git pull --rebase             # 先拉取并合并
git push                      # 再推送
```

### 提交信息写错了
```bash
git commit --amend            # 修改最后一次提交信息
```

### 文件添加错了
```bash
git reset HEAD 文件名         # 从暂存区移除
```

---

## 🎯 推荐的工作流程

```bash
# 1. 开始工作前，先拉取最新代码
git pull

# 2. 创建新分支（可选，大功能推荐）
git checkout -b feature-新功能

# 3. 开发过程中，多次小步提交
git add .
git commit -m "实现基础功能"

git add .
git commit -m "完善样式"

# 4. 推送到远程
git push origin feature-新功能

# 5. 合并到主分支（在 GitHub 或本地）
git checkout main
git merge feature-新功能
git push

# 6. 删除功能分支（可选）
git branch -D feature-新功能
```

---

## 🔒 安全相关

### 查看配置
```bash
git config --list             # 查看所有配置
git config user.name          # 查看用户名
git config user.email         # 查看邮箱
```

### 修改配置
```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
```
