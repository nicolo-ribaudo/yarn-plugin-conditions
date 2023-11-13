import { Locator, Project, structUtils } from "@yarnpkg/core";
import { Filename, ppath, xfs } from "@yarnpkg/fslib";
import { getLibzipPromise, ZipFS } from "@yarnpkg/libzip";

// We always set the same mtime in generated zip archives, to keep the checksum static.
const mtime = 1580511600000;

export async function createSimplePackage(
  locator: Locator,
  project: Project,
  packageJson: object,
  indexJS: string,
  indexMJS?: string,
) {
  const [tmpDir, libzip] = await Promise.all([
    xfs.mktempPromise(),
    getLibzipPromise(),
  ]);

  const tmpFile = ppath.join(tmpDir, "condition.zip" as Filename);
  const prefixPath = structUtils.getIdentVendorPath(locator);

  const conditionPackage = new ZipFS(tmpFile, {
    libzip,
    create: true,
    level: project.configuration.get(`compressionLevel`),
  });

  await conditionPackage.mkdirpPromise(prefixPath);

  await Promise.all([
    conditionPackage.writeJsonPromise(
      ppath.join(prefixPath, "package.json" as Filename),
      packageJson
    ),
    conditionPackage.writeFilePromise(
      ppath.join(prefixPath, "index.js" as Filename),
      indexJS
    ),
    indexMJS && conditionPackage.writeFilePromise(
      ppath.join(prefixPath, "index.mjs" as Filename),
      indexMJS
    ),
  ]);

  await Promise.all(
    conditionPackage
      .getAllFiles()
      .map((path) => conditionPackage.utimesPromise(path, mtime, mtime))
  );

  return conditionPackage;
}
