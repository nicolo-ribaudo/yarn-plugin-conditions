# `@yarnpkg/plugin-conditions`

This Yarn plugin adds support for the `condition:` [protocol](https://yarnpkg.com/features/protocols). It can be used for conditionally selecting a dependency version depending on a specific flag.

The conditions are toggled based on a corresponding environment flag.

> ⚠️ Only CommonJS dependencies are supported at the moment.

## Installation

You can add this plugin to your Yarn 2 ("Yarn Berry") project running the following command:

```bash
yarn plugin import from sources --repository nicolo-ribaudo/yarn-plugin-conditions --branch main --path bundles/@yarnpkg/plugin-conditions.js
```

## Configuration

Before using the `condition:` protocol, you must first list the allowed conditions in your `.yarnrc.yml` file. You can optionally specify a default value for the condition when it's not explicitly set.

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

When running `yarn pack` or `yarn publish`, Yarn will remove the `condition:` protocol from `package.json` files, replacing it with the dependency version selected by the `<test>` env variable. This makes sure that packages published on the npm registry are compatible with the rest of the ecosystem.

## Example

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
