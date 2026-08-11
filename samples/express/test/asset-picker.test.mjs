import assert from "node:assert/strict";
import test from "node:test";

import {
  assetDisplayName,
  assetThumbnailUrl,
  filterAssets,
  findAsset,
} from "../public/demos/manzai-training/asset-picker.js";

const assets = [
  {
    id: "avatar-haru",
    name: "Haru Guide",
    thumbnail_urls: { head: "https://example.test/haru.png" },
  },
  {
    id: "avatar-oliver",
    name: "Oliver Host",
    thumbnail_urls: {},
  },
  {
    id: "scene-lab",
    name: "High Tech Lab",
    thumbnail_urls: { default: "https://example.test/lab.png" },
  },
];

test("thumbnail URL uses the asset-type-specific catalog key", () => {
  assert.equal(assetThumbnailUrl(assets[0], "avatar"), "https://example.test/haru.png");
  assert.equal(assetThumbnailUrl(assets[2], "scene"), "https://example.test/lab.png");
  assert.equal(assetThumbnailUrl(assets[0], "scene"), "");
  assert.equal(assetThumbnailUrl(assets[1], "avatar"), "");
});

test("display name falls back to the stable asset ID", () => {
  assert.equal(assetDisplayName({ id: "avatar-one", name: "  " }), "avatar-one");
});

test("assets can be found and filtered by normalized name or ID", () => {
  assert.equal(findAsset(assets, "avatar-oliver"), assets[1]);
  assert.deepEqual(filterAssets(assets, "ｈａｒｕ"), [assets[0]]);
  assert.deepEqual(filterAssets(assets, "SCENE-LAB"), [assets[2]]);
  assert.deepEqual(filterAssets(assets, ""), assets);
});
