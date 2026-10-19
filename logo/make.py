from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
FONT=TTFont("/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf")
gs=FONT.getGlyphSet();cmap=FONT.getBestCmap();upm=FONT["head"].unitsPerEm;hmtx=FONT["hmtx"]
PLUM="#6A3560";APR="#F2A65A";CREAM="#FFF4E8";INK="#2A1F27";WHITE="#FFFFFF"
def text_path(txt,size,x,y,track=0):
    s=size/upm;pen=SVGPathPen(gs);cx=x;pos=[]
    for ch in txt:
        g=cmap[ord(ch)];tp=TransformPen(pen,(s,0,0,-s,cx,y));gs[g].draw(tp)
        adv=hmtx[g][0]*s;pos.append((ch,cx,adv));cx+=adv+track
    return pen.getCommands(),cx-track,pos
def paw(cx,cy,r,fill):
    # r ~ size of main pad
    return (f'<ellipse cx="{cx}" cy="{cy+r*0.35}" rx="{r*0.62}" ry="{r*0.52}" fill="{fill}"/>'
      f'<ellipse cx="{cx-r*0.62}" cy="{cy-r*0.28}" rx="{r*0.2}" ry="{r*0.26}" transform="rotate(-18 {cx-r*0.62} {cy-r*0.28})" fill="{fill}"/>'
      f'<ellipse cx="{cx-r*0.22}" cy="{cy-r*0.58}" rx="{r*0.2}" ry="{r*0.27}" fill="{fill}"/>'
      f'<ellipse cx="{cx+r*0.22}" cy="{cy-r*0.58}" rx="{r*0.2}" ry="{r*0.27}" fill="{fill}"/>'
      f'<ellipse cx="{cx+r*0.62}" cy="{cy-r*0.28}" rx="{r*0.2}" ry="{r*0.26}" transform="rotate(18 {cx+r*0.62} {cy-r*0.28})" fill="{fill}"/>')
def scissors(x,y,s,col):
    # small scissors pointing right, origin at rings
    return (f'<g transform="translate({x} {y}) scale({s})" fill="none" stroke="{col}" stroke-width="3.2" stroke-linecap="round">'
            f'<circle cx="0" cy="-7" r="5"/><circle cx="0" cy="7" r="5"/>'
            f'<path d="M4 -4 L26 6 M4 4 L26 -6"/></g>')

# ---------- Concept A: hondenkopje met kuif ----------
def iconA(ox=0,oy=0,sz=200,bg=True):
    k=sz/200
    return f'''<g transform="translate({ox} {oy}) scale({k})">
{f'<rect x="0" y="0" width="200" height="200" rx="52" fill="{PLUM}"/>' if bg else ''}
<ellipse cx="58" cy="108" rx="22" ry="40" transform="rotate(22 58 108)" fill="{APR}"/>
<ellipse cx="142" cy="108" rx="22" ry="40" transform="rotate(-22 142 108)" fill="{APR}"/>
<circle cx="100" cy="56" r="21" fill="{CREAM}"/><circle cx="79" cy="66" r="16" fill="{CREAM}"/><circle cx="121" cy="66" r="16" fill="{CREAM}"/>
<circle cx="100" cy="110" r="45" fill="{CREAM}"/>
<ellipse cx="100" cy="132" rx="25" ry="19" fill="{WHITE}"/>
<circle cx="83" cy="104" r="5.5" fill="{INK}"/><circle cx="117" cy="104" r="5.5" fill="{INK}"/>
<circle cx="85" cy="102" r="1.6" fill="{WHITE}"/><circle cx="119" cy="102" r="1.6" fill="{WHITE}"/>
<path d="M91 121 Q100 116 109 121 Q109 128 100 131 Q91 128 91 121Z" fill="{INK}"/>
<path d="M100 131 L100 137 M92 139 Q100 145 108 139" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>
<path d="M134 152 l10 -6 l0 12z M134 152 l-10 -6 l0 12z" fill="{APR}"/>
</g>'''

def wordmark(x,y,size,col,dotcol=None,pawdot=False,cut=False,track=-2):
    txt="trımmy" if pawdot else "trimmy"
    d,end,pos=text_path(txt,size,x,y,track)
    out=f'<path d="{d}" fill="{col}"/>'
    if pawdot:
        ch,cx,adv=pos[2]
        out+=paw(cx+adv/2,y-size*0.80,size*0.15,dotcol)
    if cut:
        ly=y+size*0.36
        out+=f'<line x1="{x+size*0.55}" y1="{ly}" x2="{end}" y2="{ly}" stroke="{dotcol}" stroke-width="{size*0.045}" stroke-dasharray="{size*0.09} {size*0.07}" stroke-linecap="round"/>'
        out+=scissors(x+size*0.12,ly,size*0.0125,dotcol)
    return out,end

def svg(w,h,body,bg=None):
    b=f'<rect width="100%" height="100%" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{b}{body}</svg>'

out={}
# A horizontaal
wm,end=wordmark(240,150,150,PLUM)
out["A-horizontaal"]=svg(int(end+30),220,iconA(10,10)+wm)
out["A-icoon"]=svg(200,200,iconA(0,0))
# B: woordmerk met pootje als i-punt en kniplijn
wm,end=wordmark(20,150,160,PLUM,APR,pawdot=True,cut=True)
out["B-horizontaal"]=svg(int(end+30),240,wm)
out["B-icoon"]=svg(200,200,f'<rect width="200" height="200" rx="52" fill="{PLUM}"/>'+paw(100,108,62,CREAM))
# C: rond icoon met t en botje + woordmerk
def iconC(ox,oy,sz,ring=PLUM):
    k=sz/200
    bone=lambda cx,cy,w,col:(f'<rect x="{cx-w/2}" y="{cy-8}" width="{w}" height="16" rx="8" fill="{col}"/>'
        +"".join(f'<circle cx="{cx+sx*w/2}" cy="{cy+sy*9}" r="11" fill="{col}"/>' for sx in(-1,1) for sy in(-1,1)))
    return (f'<g transform="translate({ox} {oy}) scale({k})"><circle cx="100" cy="100" r="100" fill="{APR}"/>'
            f'<path d="M86 42 Q86 34 94 34 L104 34 Q112 34 112 42 L112 128 Q112 146 128 146 L134 146 Q142 146 142 154 L142 158 Q142 166 134 166 L124 166 Q86 166 86 130 Z" fill="{ring}"/>'
            +bone(99,80,74,CREAM)+'</g>')
wm,end=wordmark(240,150,150,INK)
out["C-horizontaal"]=svg(int(end+30),220,iconC(10,10,200)+wm)
out["C-icoon"]=svg(200,200,iconC(0,0,200))
wm,end=wordmark(240,150,150,CREAM)
out["A-horizontaal-donker"]=svg(int(end+30),220,iconA(10,10)+wm)
wm,end=wordmark(20,150,160,CREAM,APR,pawdot=True,cut=True)
out["B-horizontaal-donker"]=svg(int(end+30),240,wm)
wm,end=wordmark(240,150,150,CREAM)
out["C-horizontaal-donker"]=svg(int(end+30),220,iconC(10,10,200)+wm)
import os
for k,v in out.items(): open(f"/home/claude/trimmy/logo/{k}.svg","w").write(v)
print({k:v[:90] for k,v in out.items()}.keys())
