# my-lint Drone

A custom drone for [Mission Control](https://github.com/your-repo/mission-control).

## Install

```bash
mission drone add ./my-lint
```

## What It Does

Describe your drone's purpose here.

## Configuration

Edit `drone.yaml` to customize:
- **triggers**: When this drone activates
- **opinions**: What it requires/suggests/blocks
- **signals**: What it emits and listens to
- **priority**: Execution order (higher = earlier)

## Development

```bash
cd my-lint
npx vitest run
```
