import {randomBytes} from "node:crypto";
import type {FastifyInstance} from "fastify";
import {PublicError} from "../errors";
import {sendFileWithRanges} from "../range-response";

type Resource = {path: string; mime: string};

export class RenderResourceRegistry {
  private readonly resources = new Map<string, Resource>();

  register(resource: Resource): string {
    const token = randomBytes(32).toString("base64url");
    this.resources.set(token, resource);
    return token;
  }

  revoke(token: string): void {
    this.resources.delete(token);
  }

  get(token: string): Resource {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new PublicError("render_resource_not_found", 404);
    const resource = this.resources.get(token);
    if (!resource) throw new PublicError("render_resource_not_found", 404);
    return resource;
  }
}

export function registerRenderResourceRoute(app: FastifyInstance, registry: RenderResourceRegistry) {
  app.get<{Params: {token: string}}>("/internal/render-resources/:token", async (request, reply) => {
    const resource = registry.get(request.params.token);
    return sendFileWithRanges({reply, path: resource.path, mime: resource.mime, range: request.headers.range, cors: "*"});
  });
}
