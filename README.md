# `@yarnpkg/plugin-conditions`

This Yarn 3 plugin adds support for the `condition:` [protocol](https://yarnpkg.com/features/protocols). It can be used for conditionally selecting a dependency version depending on a specific flag. Additionally, it can be use to optionally include or exclude some `package.json` fields using the new `"conditions"` field.

Conditions are toggled based on a corresponding environment flag.

> ⚠️ Only CommonJS dependencies are supported at the moment.

## Installation

You can add this plugin to your Yarn 3 ("Yarn Berry") project running the following command:

```bash
yarn plugin import https://raw.githubusercontent.com/nicolo-ribaudo/yarn-plugin-conditions/main/bundles/%40yarnpkg/plugin-conditions.js
```

## Configuration

Before using conditions, you must first list the allowed ones in your `.yarnrc.yml` file. You can optionally specify a default value for the condition when it's not explicitly set.

```yaml
# .yarnrc.yml

conditions:
  node10:
    default: true
  experimental: {}
```

This plugin will throw an error if you use a condition not defined in your configuration: this is because a typo in the condition name will result in a package published with the wrong dependencies.

## Usage

You can now use the `condition:` protocol to specify dependency versions. It's syntax is

```
condition: <test> ? <if-true> : <if-false>
```

- `test` is the name of an environment variable
- `if-true` is the dependency version to use when `<test>` is `true` (optional).
- `if-false` is the dependency version to use when `<test>` is `true` (optional).

When running `yarn install`, Yarn will install both the `<if-true>` and `<if-false>` dependencies. At _runtime_, it will decide which dependency to load based on the `<test>` condition.

For ESM dependencies, you have to explicitly specify the list of exports you want to be re-exported:
```
condition: <test> ? <if-true> : <if-false> (esm:var1,default,anotherExport)
```

If you need the intermediate package to have `peerDependency` so that they can be properly propagate to the `<if-true>` and `<if-false>` packages, you need to explicitly list them:
```
condition: <test> ? <if-true> : <if-false> (peer:pkg-1,@another/package)
```

You can also add a `"conditions"` field to your `package.json` file to specify which fields to use when a specific condition is enabled:
```jsonc
{
  // ...
  "conditions": {
    "<test>": [{ /* <if-true> */ }, { /* <if-false> */ }]
  }
}
```

When running `yarn pack` or `yarn publish`, Yarn will remove the `condition:` protocol and the `"conditions"` field from `package.json` files, replacing it with the dependency version selected by the `<test>` env variable. This makes sure that packages published on the npm registry are compatible with the rest of the ecosystem.

If you want to remove the conditions from your `package.json` files, you can run the `yarn condition materialize <test> [--true|--false]` command.

> 💡 Since the `"conditions"` field is only resolved when packing/publishing, its contents won't affect the Node.js behavior during development. If necessary, you can specify the conditional fields outside of the `"conditions"` field, with a value that works for the different conditions test values.

## Example

### `condition:` protocol

You could set your dependencies like this:

```json
{
  "dependencies": {
    "chokidar": "condition: node10 ? ^3.5.1 : ^2.1.8",
    "rollup": "condition: experimental ? : ^2.36.2",
    "parcel": "condition: experimental ? next : "
  }
}
```

This can be resolved to four different sets of dependencies:

- `node10` is `true` or unset, `experimental` is `false` or unset:

  ```json
  {
    "dependencies": {
      "chokidar": "^3.5.1",
      "rollup": "^2.36.2"
    }
  }
  ```

- `node10` is `true` or unset, `experimental` is `true`:

  ```json
  {
    "dependencies": {
      "chokidar": "^3.5.1",
      "parcel": "next"
    }
  }
  ```

- `node10` is `false`, `experimental` is `false` or unset:

  ```json
  {
    "dependencies": {
      "chokidar": "^2.1.8",
      "rollup": "^2.36.2"
    }
  }
  ```

- `node10` is `false`, `experimental` is `true`:

  ```json
  {
    "dependencies": {
      "chokidar": "^2.1.8",
      "parcel": "next"
    }
  }
  ```

If you want to remove the `experimental` condition (evaluating it to `true`) you can run

```
yarn condition materialize experimental --true
```

The `package.json` file will be automatically updated to

```json
{
  "dependencies": {
    "chokidar": "condition: node10 ? ^3.5.1 : ^2.1.8",
    "parcel": "next"
  }
}
```

### `"conditions"` field

You might want to rename an entry-point of your package, from `./old-name` to `./new-name`, but only do it when a given condition is enabled:
```jsonc
{
  "conditions": {
    "experimental": [ /* if-true */{
      "exports": {
        "./new-name": "./lib/new-name.js"
      }
    }, /* if-false */ {
      "exports": {
        "./old-name": "./lib/old-name.js"
      }
    }]
  },
  "exports": {
    "./old-name": "./lib/old-name.js",
    "./new-name": "./lib/new-name.js"
  }
}
```

With this `package.json` both `./old-name` and `./new-name` will work during development, but the published `package.json` will be either
```json
{
  "exports": {
    "./old-name": "./lib/old-name.js"
  }
}
```
or
```json
{
  "exports": {
    "./new-name": "./lib/new-name.js"
  }
}
```

## Contributing

Contributions are welcome! The most lacking part now is tests (I haven't set them up yet).

Steps:

1. Clone this repository.
2. Run `yarn` to install its dependencies.
3. Modify the files in the `source` directory.
4. Run `yarn build` every time you update the `source` folder. Don't forget to commit the result!

You can test your changes by creating a separate Yarn project, and importing this plugin by adding the following options to the `.yarnrc.yml` file of that project:

```yaml
plugins:
  - path: <path-to-this-plugin-folder>/bundles/@yarnpkg/plugin-conditions.js
    spec: <path-to-this-plugin-folder>/bundles/@yarnpkg/plugin-conditions.js
```
