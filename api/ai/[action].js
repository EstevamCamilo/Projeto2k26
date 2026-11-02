/** Vercel Node.js Function; autenticação e validação permanecem no servidor. */
import { handleAIRequest } from '../../server/ai/handler.mjs';
export const config = { maxDuration: 60, api: { bodyParser: { sizeLimit: '8kb' } } };
export default async function handler(request, response) {
  if (!(await handleAIRequest(request, response))) {
    response.statusCode = 404;
    response.end();
  }
}
