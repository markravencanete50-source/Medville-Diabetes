import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { imageUploadSignature } from "../functions/admin/images.js";
const config = {secret:"test-secret",apiKey:"test-key",cloudName:"test-cloud"};

test("image signing rejects unknown paths and missing feature permissions", () => {
  for (const folder of ["../products", "__proto__", "constructor", "leads", "products"]) {
    assert.ok(imageUploadSignature({role:"sales",features:[]},{folder},config).error);
  }
});
test("image signing enforces the preset, unique ID and no overwrite without disclosing the secret", () => {
  const r = imageUploadSignature({role:"sales",features:["products"]},{folder:"products",public_id:"forged",overwrite:true},config,123000);
  assert.equal(r.params.overwrite,"false");
  assert.equal(r.params.timestamp,"123");
  assert.equal(r.params.upload_preset,"medville_signed_images");
  assert.match(r.params.public_id,/^medville\/products\/[0-9a-f-]{36}$/);
  const canonical=Object.keys(r.params).sort().map(k=>`${k}=${r.params[k]}`).join('&');
  assert.equal(r.signature,createHash('sha256').update(canonical+config.secret).digest('hex'));
  assert.ok(!JSON.stringify(r).includes(config.secret));
  assert.notEqual(r.params.public_id,imageUploadSignature({role:"owner"},{folder:"products"},config).params.public_id);
});
