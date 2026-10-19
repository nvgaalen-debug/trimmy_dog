import asyncio,glob,os,re
from playwright.async_api import async_playwright
D="/home/claude/trimmy/logo/"
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page()
        for f in sorted(glob.glob(D+"*.svg")):
            s=open(f).read();w,h=map(int,re.search(r'viewBox="0 0 (\d+) (\d+)"',s).groups())
            target=512 if "icoon" in f else 1400
            sc=target/max(w,h);W,H=round(w*sc),round(h*sc)
            s2=re.sub(r'width="\d+" height="\d+"',f'width="{W}" height="{H}"',s,count=1)
            await pg.set_viewport_size({"width":W,"height":H})
            await pg.set_content(f'<html><body style="margin:0;background:transparent">{s2}</body></html>')
            await pg.screenshot(path=D+"png/trimmy-logo-"+os.path.basename(f)[:-4]+".png",omit_background=True,clip={"x":0,"y":0,"width":W,"height":H})
        await b.close()
asyncio.run(main())
