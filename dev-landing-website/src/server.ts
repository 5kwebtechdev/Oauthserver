import { AngularNodeAppEngine, createNodeRequestHandler, writeResponseToNodeResponse } from '@angular/ssr/node';
import { IncomingMessage } from 'node:http';

const engine = new AngularNodeAppEngine();

// The existing website server keeps ownership of redirects, API validation,
// static files and status codes. Only public blog pages use this renderer.
export function renderPublicRequest(request: IncomingMessage, context: unknown) {
  return engine.handle(request, context);
}

export const reqHandler = createNodeRequestHandler(async (request, response, next) => {
  try {
    const rendered = await engine.handle(request);
    if (rendered) await writeResponseToNodeResponse(rendered, response);
    else next();
  } catch (error) { next(error); }
});
