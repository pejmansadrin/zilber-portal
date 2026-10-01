import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";
import sharp from "sharp";
const require = createRequire(import.meta.url);
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "zilber-photo-qa-"));
try {
  const shared = ts.transpileModule(await fs.readFile("src/lib/profile-photo.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  await fs.writeFile(path.join(temporary,"shared.mjs"),shared);
  const source = (await fs.readFile("src/lib/account/profile-photo.ts","utf8")).replace('"../profile-photo"',JSON.stringify(pathToFileURL(path.join(temporary,"shared.mjs")).href)).replace('"sharp"',JSON.stringify(pathToFileURL(require.resolve("sharp")).href));
  await fs.writeFile(path.join(temporary,"server.mjs"),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
  const {normalizeProfilePhoto}=await import(pathToFileURL(path.join(temporary,"server.mjs")).href);
  const {profileCrop,defaultProfilePhoto,PROFILE_PHOTO_MAX_BYTES}=await import(pathToFileURL(path.join(temporary,"shared.mjs")).href);
  for(const [width,height] of [[4000,3000],[2400,4000],[512,512],[1,1]]) for(const zoom of [1,1.01,2,4,8]) for(const x of [-2,-1,0,1,2]) for(const y of [-2,-1,0,1,2]) {
    const crop=profileCrop(width,height,zoom,x,y);
    assert(crop.x>=0 && crop.y>=0 && crop.side>0);
    assert(crop.x+crop.side<=width+1e-8 && crop.y+crop.side<=height+1e-8,"Crop must never expose empty pixels");
  }
  assert.deepEqual(profileCrop(4000,3000,2,0,0),{x:1250,y:750,side:1500});
  assert(defaultProfilePhoto("مرد").endsWith("avatar-male.svg"));
  assert(defaultProfilePhoto("زن").endsWith("avatar-female.svg"));
  assert(defaultProfilePhoto(null).endsWith("avatar-neutral.svg"));
  const image=await sharp({create:{width:3000,height:2000,channels:3,background:"#395b96"}}).jpeg({quality:98}).withMetadata({orientation:6}).toBuffer();
  const normalized=await normalizeProfilePhoto(image);
  const metadata=await sharp(normalized).metadata();
  assert.equal(metadata.format,"webp"); assert.equal(metadata.width,512); assert.equal(metadata.height,512);
  assert(!metadata.exif && !metadata.orientation,"Output must have no retained EXIF");
  assert(normalized.byteLength<=PROFILE_PHOTO_MAX_BYTES); assert(normalized.byteLength<image.byteLength);
  const alpha=await sharp({create:{width:640,height:640,channels:4,background:{r:60,g:90,b:140,alpha:.4}}}).png().toBuffer();
  assert((await sharp(await normalizeProfilePhoto(alpha)).metadata()).hasAlpha);
  await assert.rejects(()=>normalizeProfilePhoto(new TextEncoder().encode("not an image")));
  for(const gender of ["male","female","neutral"]) {
    const svg=await fs.readFile(`public/images/avatar-${gender}.svg`);
    const rendered=await sharp(svg).metadata(); assert.equal(rendered.width,256); assert.equal(rendered.height,256);
  }
  console.log(`PASS: crop bounds and defaults; JPEG/PNG normalization to 512px WebP, EXIF removal, alpha, invalid-image denial. Example: ${image.length} → ${normalized.length} bytes.`);
} finally { await fs.rm(temporary,{recursive:true,force:true}); }
