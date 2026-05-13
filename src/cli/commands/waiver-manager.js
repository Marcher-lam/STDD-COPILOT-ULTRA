const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class WaiverManager {
  constructor(cwd) {
    this.cwd = cwd || process.cwd();
    this.waiversPath = path.join(this.cwd, 'stdd', 'constitution', 'waivers.yaml');
  }

  _ensureDir() {
    const dir = path.dirname(this.waiversPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  _read() {
    if (!fs.existsSync(this.waiversPath)) {
      return { waivers: [] };
    }
    try {
      const content = fs.readFileSync(this.waiversPath, 'utf8');
      const data = yaml.load(content);
      return data && data.waivers ? data : { waivers: [] };
    } catch (_) {
      return { waivers: [] };
    }
  }

  _write(data) {
    this._ensureDir();
    const content = yaml.dump(data, { lineWidth: -1, noRefs: true });
    fs.writeFileSync(this.waiversPath, content, 'utf8');
  }

  list() {
    const data = this._read();
    return data.waivers || [];
  }

  findByArticle(article) {
    return this.list().filter(w => Number(w.article) === Number(article));
  }

  add({ article, reason, days = 30, force = false }) {
    const articleNum = Number(article);
    if (Number.isNaN(articleNum) || articleNum < 1 || articleNum > 9) {
      throw new Error(`Invalid article number: ${article}. Must be 1-9.`);
    }
    if (!reason) {
      throw new Error('Waiver --reason is required.');
    }

    const data = this._read();
    const existing = data.waivers.filter(w => Number(w.article) === articleNum);

    if (existing.length > 0 && !force) {
      throw new Error(
        `Article ${articleNum} already has a waiver. Use --force to replace.`
      );
    }

    if (existing.length > 0 && force) {
      data.waivers = data.waivers.filter(w => Number(w.article) !== articleNum);
    }

    const now = new Date();
    const grantedAt = now.toISOString();
    const validUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

    data.waivers.push({
      article: articleNum,
      reason,
      days: Number(days),
      granted_at: grantedAt,
      valid_until: validUntil,
    });

    this._write(data);

    return { article: articleNum, days: Number(days), validUntil };
  }

  remove(article) {
    const articleNum = Number(article);
    const data = this._read();
    const count = data.waivers.filter(w => Number(w.article) === articleNum).length;
    if (count === 0) {
      throw new Error(`No waiver found for Article ${articleNum}.`);
    }
    data.waivers = data.waivers.filter(w => Number(w.article) !== articleNum);
    this._write(data);
    return count;
  }
}

module.exports = { WaiverManager };
