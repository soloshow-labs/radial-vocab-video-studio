import {describe, expect, it} from "vitest";
import {parseWordPairs} from "../../src/domain/import-words";

describe("word pair import", () => {
  it("parses one-space English and Chinese rows", () => {
    expect(parseWordPairs("postman 邮递员\nfisherman 渔夫\nsportsman 运动员\ngentleman 绅士")).toEqual([
      {text: "postman", meaningZh: "邮递员"},
      {text: "fisherman", meaningZh: "渔夫"},
      {text: "sportsman", meaningZh: "运动员"},
      {text: "gentleman", meaningZh: "绅士"},
    ]);
  });

  it("keeps explicit separators, multi-word English, and reversed rows working", () => {
    expect(parseWordPairs("fire fighter 消防员\nteammate\t队友\n校友 | schoolmate")).toEqual([
      {text: "fire fighter", meaningZh: "消防员"},
      {text: "teammate", meaningZh: "队友"},
      {text: "schoolmate", meaningZh: "校友"},
    ]);
  });

  it("keeps the two-line English then Chinese format working", () => {
    expect(parseWordPairs("postman\n邮递员\nfisherman\n渔夫")).toEqual([
      {text: "postman", meaningZh: "邮递员"},
      {text: "fisherman", meaningZh: "渔夫"},
    ]);
  });
});
