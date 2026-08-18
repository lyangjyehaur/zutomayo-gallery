import { execSync } from 'child_process'

const runGitCommand = (command) => execSync(command, { encoding: 'utf-8' }).trim()

export const getDeployCommits = (execCommand = runGitCommand) => {
  try {
    const tags = execCommand("git tag -l 'deploy-v*' --sort=-v:refname")
      .split('\n')
      .map((tag) => tag.trim())
      .filter(Boolean)
    const currentTags = execCommand("git tag --points-at HEAD -l 'deploy-v*'")
      .split('\n')
      .map((tag) => tag.trim())
      .filter(Boolean)
    const previousTag = tags.find((tag) => !currentTags.includes(tag))
    if (!previousTag) return []

    const log = execCommand(`git log ${previousTag}..HEAD --oneline --no-merges -10`)
    return log
      ? log.split('\n').map((commit) => commit.trim())
        .filter(Boolean)
        .map((commit) => commit
          .replace(/https?:\/\/ztmy\.art/gi, 'the previous site domain')
          .replace(/https?:\/\/[^\s]*ztmr\.club/gi, 'the previous service domain')
          .replace(/\bztmy\.art\b/gi, 'the previous site domain')
          .replace(/\b[^\s]*ztmr\.club\b/gi, 'the previous service domain'))
      : []
  } catch (e) {
    return []
  }
}

export const createVersionData = ({ version, buildDate, buildHash, commits }) => ({
  version,
  buildDate,
  buildHash,
  commits
})
