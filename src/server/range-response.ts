import {createReadStream} from "node:fs";
import {stat} from "node:fs/promises";
import type {FastifyReply} from "fastify";
import {PublicError} from "./errors";

export async function sendFileWithRanges(options: {
  reply: FastifyReply;
  path: string;
  mime: string;
  range?: string;
  cors?: string;
}) {
  const {size} = await stat(options.path);
  const range = parseRange(options.range, size);
  options.reply
    .header("Content-Type", options.mime)
    .header("Accept-Ranges", "bytes")
    .header("Cache-Control", "no-store")
    .header("Content-Length", range ? range.end - range.start + 1 : size);
  if (options.cors) options.reply.header("Access-Control-Allow-Origin", options.cors);
  if (range) {
    return options.reply
      .status(206)
      .header("Content-Range", `bytes ${range.start}-${range.end}/${size}`)
      .send(createReadStream(options.path, range));
  }
  return options.reply.send(createReadStream(options.path));
}

function parseRange(value: string | undefined, size: number): {start: number; end: number} | undefined {
  if (!value) return undefined;
  const match = /^bytes=(\d+)-(\d*)$/.exec(value);
  if (!match) throw new PublicError("invalid_range", 416);
  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : size - 1;
  const end = Math.min(requestedEnd, size - 1);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= size) {
    throw new PublicError("invalid_range", 416);
  }
  return {start, end};
}
