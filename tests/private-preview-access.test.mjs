import test from "node:test";
import assert from "node:assert/strict";
import {
 PREVIEW_SESSION_SECONDS,issuePreviewSession,verifyPreviewSession,
 verifyPreviewPassword,isPreviewConfigured,getCookieValue,
} from "../lib/private-preview/access.ts";

const secret="a".repeat(64);
const password="Owner-Only-Long-Passphrase-!2026";
const env={
 SEE_PREVIEW_PASSWORD:password,
 SEE_PREVIEW_SESSION_SECRET:secret,
 UPSTASH_REDIS_REST_URL:"https://eu1-calm-cat-123.upstash.io",
 UPSTASH_REDIS_REST_TOKEN:"redis-test-token",
};
test("Private Beta setup rejects missing/short credentials and insecure limiter endpoints",()=>{
 assert.equal(isPreviewConfigured(env),true);
 assert.equal(isPreviewConfigured({...env,SEE_PREVIEW_PASSWORD:"short"}),false);
 assert.equal(isPreviewConfigured({...env,SEE_PREVIEW_SESSION_SECRET:"short"}),false);
 assert.equal(isPreviewConfigured({...env,UPSTASH_REDIS_REST_URL:"http://example.org"}),false);
 assert.equal(isPreviewConfigured({...env,UPSTASH_REDIS_REST_URL:"https://fake-upstash.io.evil.net"}),false);
 assert.equal(isPreviewConfigured({...env,UPSTASH_REDIS_REST_TOKEN:""}),false);
});
test("Signed sessions are valid for at most 12 hours and expire on time",()=>{
 const now=Date.UTC(2026,10,5,18);
 const cookie=issuePreviewSession(secret,now);
 assert.equal(verifyPreviewSession(cookie,secret,now),true);
 assert.equal(verifyPreviewSession(cookie,secret,now+(PREVIEW_SESSION_SECONDS-1)*1000),true);
 assert.equal(verifyPreviewSession(cookie,secret,now+PREVIEW_SESSION_SECONDS*1000),false);
 assert.equal(verifyPreviewSession(cookie,"b".repeat(64),now),false);
 assert.equal(verifyPreviewSession(cookie.slice(0,-1)+"f",secret,now),false);
 assert.equal(verifyPreviewSession(undefined,secret,now),false);
});
test("Private owner password uses fixed-size digest equality",()=>{
 assert.equal(verifyPreviewPassword(password,password),true);
 assert.equal(verifyPreviewPassword(password+"X",password),false);
 assert.equal(verifyPreviewPassword(null,password),false);
 assert.equal(verifyPreviewPassword("X".repeat(400),password),false);
 assert.equal(verifyPreviewPassword(password,"short"),false);
});
test("Session cookie extraction does not confuse similarly named cookies",()=>{
 const token=issuePreviewSession(secret);
 const raw="other=hello; see_private_preview="+encodeURIComponent(token)+"; see_private_preview_more=evil";
 assert.equal(getCookieValue(raw),token);
 assert.equal(getCookieValue("see_private_preview_more=evil"),undefined);
 assert.equal(getCookieValue(null),undefined);
});
