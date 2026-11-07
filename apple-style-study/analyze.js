const { chromium, devices } = require('playwright');
const SP = process.argv[2];
(async () => {
  const browser = await chromium.launch();
  const out = {};
  for (const [name, ctxOpts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['mobile', devices['iPhone 13']]]) {
    const ctx = await browser.newContext(ctxOpts);
    const page = await ctx.newPage();
    await page.goto('https://www.apple.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    // scroll through to trigger lazy/scroll animations
    const h = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < h; y += 600) { await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(120); }
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(800);
    await page.screenshot({ path: `${SP}/shots/apple-${name}.png` });
    out[name] = await page.evaluate(() => {
      const cs = el => getComputedStyle(el);
      const pick = sel => [...document.querySelectorAll(sel)].filter(e => e.offsetParent).slice(0, 6).map(e => {
        const s = cs(e); return { tag: e.tagName, fs: s.fontSize, lh: s.lineHeight, ls: s.letterSpacing, fw: s.fontWeight, color: s.color };
      });
      const all = [...document.querySelectorAll('*')];
      const trans = {}, anim = {}, radius = {}, bgs = {};
      let sticky = 0, backdrop = [];
      for (const e of all) {
        const s = cs(e);
        if (s.transitionDuration && s.transitionDuration !== '0s') { const k = s.transitionDuration.split(',')[0] + ' ' + s.transitionTimingFunction.split(',')[0]; trans[k] = (trans[k] || 0) + 1; }
        if (s.animationName && s.animationName !== 'none') { const k = s.animationDuration + ' ' + s.animationTimingFunction; anim[k] = (anim[k] || 0) + 1; }
        if (s.position === 'sticky') sticky++;
        if (s.backdropFilter && s.backdropFilter !== 'none') backdrop.push({ tag: e.tagName, bf: s.backdropFilter, bg: s.backgroundColor, h: e.offsetHeight });
        if (s.borderRadius !== '0px' && e.offsetWidth > 100) radius[s.borderRadius] = (radius[s.borderRadius] || 0) + 1;
        if (e.offsetHeight > 400 && s.backgroundColor !== 'rgba(0, 0, 0, 0)') bgs[s.backgroundColor] = (bgs[s.backgroundColor] || 0) + 1;
      }
      const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 8);
      const body = cs(document.body);
      const nav = document.querySelector('nav, #globalnav, header');
      const btn = [...document.querySelectorAll('a.button, .button, a[class*=button]')].filter(e => e.offsetParent).slice(0, 3).map(e => { const s = cs(e); return { fs: s.fontSize, pad: s.padding, r: s.borderRadius, bg: s.backgroundColor, color: s.color, minW: s.minWidth }; });
      return {
        fontFamily: body.fontFamily, bodyFs: body.fontSize, bodyColor: body.color, bodyBg: body.backgroundColor,
        h1: pick('h1'), h2: pick('h2'), h3: pick('h3'), p: pick('p').slice(0, 3),
        nav: nav && { h: nav.offsetHeight, bg: cs(nav).backgroundColor, bf: cs(nav).backdropFilter },
        buttons: btn, transitions: top(trans), animations: top(anim), radius: top(radius), sectionBgs: top(bgs),
        sticky, backdrop: backdrop.slice(0, 4),
        videos: document.querySelectorAll('video').length, pageHeight: document.body.scrollHeight,
        snapContainers: all.filter(e => cs(e).scrollSnapType !== 'none').length,
      };
    });
    await ctx.close();
  }
  require('fs').writeFileSync(`${SP}/metrics.json`, JSON.stringify(out, null, 1));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
