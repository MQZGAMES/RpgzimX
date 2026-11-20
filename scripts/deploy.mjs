// Publish the built game to GitHub Pages, preserving the deployment history.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const remote = git(['remote', 'get-url', 'origin']);
const name = git(['config', 'user.name']);
const email = git(['config', 'user.email']);
const rev = git(['rev-parse', '--short', 'HEAD']);
const dist = resolve('dist');
const tempRoot = realpathSync(tmpdir());
const work = mkdtempSync(join(tempRoot, 'rpgzimx-deploy-'));

try {
  const run = (...args) => git(args, work);
  cpSync(dist, work, { recursive: true });
  writeFileSync(join(work, '.nojekyll'), '');
  run('init', '--quiet', '--initial-branch=gh-pages');
  run('config', 'user.name', name);
  run('config', 'user.email', email);
  if (run('ls-remote', '--heads', remote, 'refs/heads/gh-pages')) {
    run('fetch', '--quiet', '--depth=1', remote, 'refs/heads/gh-pages');
    run('update-ref', 'HEAD', run('rev-parse', 'FETCH_HEAD'));
  }

  run('add', '--all');
  run('commit', '--quiet', '-m', `Deploy ${rev}`, '-m', 'Co-authored-by: OpenBot <335604065+openbotgit[bot]@users.noreply.github.com>');
  run('push', remote, 'HEAD:refs/heads/gh-pages');
  console.log(`Publicado no gh-pages (${rev})`);
} finally {
  const target = realpathSync(work);
  if (dirname(target) === tempRoot) rmSync(target, { recursive: true, force: true });
}
