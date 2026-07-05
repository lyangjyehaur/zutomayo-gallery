import { describe, expect, it } from "vitest"
import { createVersionData, getDeployCommits } from "./build-version.js"

describe("version.json build data", () => {
  it("uses commits from the latest deploy tag when HEAD has not been tagged yet", () => {
    const commands = []
    const execCommand = (command) => {
      commands.push(command)
      if (command === "git tag -l 'deploy-v*' --sort=-v:refname") {
        return "deploy-v3.7.9-previous\ndeploy-v3.7.8-older\n"
      }
      if (command === "git tag --points-at HEAD -l 'deploy-v*'") {
        return ""
      }
      if (command === "git log deploy-v3.7.9-previous..HEAD --oneline --no-merges -10") {
        return "abc1234 commit message 1\ndef5678 commit message 2\n"
      }
      throw new Error(`Unexpected command: ${command}`)
    }

    expect(getDeployCommits(execCommand)).toEqual([
      "abc1234 commit message 1",
      "def5678 commit message 2",
    ])
    expect(commands).toEqual([
      "git tag -l 'deploy-v*' --sort=-v:refname",
      "git tag --points-at HEAD -l 'deploy-v*'",
      "git log deploy-v3.7.9-previous..HEAD --oneline --no-merges -10",
    ])
  })

  it("skips the current deploy tag when HEAD is already tagged", () => {
    const execCommand = (command) => {
      if (command === "git tag -l 'deploy-v*' --sort=-v:refname") {
        return "deploy-v3.7.10-current\ndeploy-v3.7.9-previous\n"
      }
      if (command === "git tag --points-at HEAD -l 'deploy-v*'") {
        return "deploy-v3.7.10-current\n"
      }
      if (command === "git log deploy-v3.7.9-previous..HEAD --oneline --no-merges -10") {
        return "abc1234 commit message 1\n"
      }
      throw new Error(`Unexpected command: ${command}`)
    }

    expect(getDeployCommits(execCommand)).toEqual(["abc1234 commit message 1"])
  })

  it("returns empty commits when there is no previous deploy tag", () => {
    const execCommand = (command) => {
      if (command === "git tag -l 'deploy-v*' --sort=-v:refname") {
        return ""
      }
      if (command === "git tag --points-at HEAD -l 'deploy-v*'") {
        return ""
      }
      throw new Error(`Unexpected command: ${command}`)
    }

    expect(getDeployCommits(execCommand)).toEqual([])
  })

  it("includes commits in generated version data", () => {
    expect(createVersionData({
      version: "3.7.10",
      buildDate: "2026-06-03",
      buildHash: "2035437",
      commits: ["abc1234 commit message 1"],
    })).toEqual({
      version: "3.7.10",
      buildDate: "2026-06-03",
      buildHash: "2035437",
      commits: ["abc1234 commit message 1"],
    })
  })
})
