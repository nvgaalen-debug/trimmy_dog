import asyncio,glob,os
from playwright.async_api import async_playwright
D="/home/claude/trimmy/logo/"
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(device_scale_factor=2)
        rows=""
        for c,lab in [("A","Kuifje"),("B","Pootje"),("C","Botje")]:
            h=open(D+f"{c}-horizontaal.svg").read();i=open(D+f"{c}-icoon.svg").read()
            rows+=f'<div class="r"><div class="l">{c} · {lab}</div><div class="c w">{h}</div><div class="c w ic">{i}</div><div class="c d">{open(D+f"{c}-horizontaal-donker.svg").read()}</div></div>'
        html=f'''<html><body style="margin:0;font:600 16px Inter,sans-serif;background:#eef0ee"><style>.r{{display:grid;grid-template-columns:110px 520px 150px 520px;gap:14px;align-items:center;padding:14px 20px}}.c{{border-radius:12px;padding:18px;display:grid;place-items:center;height:150px}}.c svg{{max-width:100%;max-height:110px;height:auto;width:auto}}.ic svg{{max-height:100px}}.w{{background:#fff}}.d{{background:#1c2220}}</style>{rows}</body></html>'''
        await pg.set_content(html);await pg.set_viewport_size({"width":1400,"height":600})
        await pg.screenshot(path=D+"overzicht.png",full_page=True);await b.close()
asyncio.run(main())
