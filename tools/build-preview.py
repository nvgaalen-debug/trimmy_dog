# Maakt van public/ (index.html + app.css + js/*.js) één bestand voor de voorbeeldversie in Claude.
# Gebruik: python3 tools/build-preview.py   ->  preview/trimmy.html
import re,os
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/'
html=open(R+'public/index.html').read()
css=open(R+'public/app.css').read()
title=re.search(r'<title>.*?</title>',html).group(0)
font=re.search(r'<link rel="stylesheet" href="https://fonts[^>]+>',html).group(0)
body=re.search(r'<body>\n(.*)</body>',html,re.S).group(1)
srcs=re.findall(r'<script src="(js/[^"]+)"></script>',body)
body=re.sub(r'\n?<!-- Logica:.*?-->\n','\n',body)
body=re.sub(r'<script src="js/[^"]+"></script>\n?','',body).rstrip()+'\n'
js='\n'.join(open(R+'public/'+s).read() for s in srcs)
out=f'{title}\n<meta name="claude:viewport-fit-sides" content="cover">\n{font}\n<style>\n{css}</style>\n{body}<script>\n{js}</script>\n'
os.makedirs(R+'preview',exist_ok=True)
open(R+'preview/trimmy.html','w').write(out)
print('preview/trimmy.html',len(out),'tekens,',len(srcs),'scripts')
