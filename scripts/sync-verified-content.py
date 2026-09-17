#!/usr/bin/env python3
"""Synchronize shared emergency markup without requiring client-side JavaScript."""
from pathlib import Path
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1]
EMERGENCY = '<a href="tel:911" class="hotline-item"><i class="bi bi-telephone-fill" aria-hidden="true"></i><span>National emergency: 911</span></a><a href="https://ehotlines.e.gov.ph/" class="hotline-item"><span>Official emergency directory</span></a>'
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
class Document(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=False)
        self.source, self.nodes, self.stack = source, [], []
        self.lines = [0]
        for line in source.splitlines(keepends=True): self.lines.append(self.lines[-1]+len(line))
        self.feed(source)
    def position(self):
        line,col = self.getpos(); return self.lines[line-1]+col
    def handle_starttag(self, tag, attrs):
        start=self.position(); node={'tag':tag,'attrs':dict(attrs),'start':start,'inner':start+len(self.get_starttag_text()),'end':start+len(self.get_starttag_text())}
        self.nodes.append(node)
        if tag not in VOID: self.stack.append(node)
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1,-1,-1):
            if self.stack[i]['tag']==tag:
                self.stack[i]['close']=self.position(); self.stack[i]['end']=self.source.find('>',self.position())+1
                del self.stack[i:]; break
    def content(self,node): return self.source[node['inner']:node.get('close',node['end'])]
def html_files():
    return [p for p in ROOT.rglob('*.html') if not any(x in p.relative_to(ROOT).parts for x in ('node_modules','dist','.git','.next','out','playwright-report','test-results'))]
def sync():
    for path in html_files():
        source=path.read_text(); doc=Document(source); edits=[]
        for n in doc.nodes:
            if 'hotline-items' in n['attrs'].get('class','').split(): edits.append((n['inner'],n['close'],EMERGENCY))
        for a,b,text in sorted(edits,reverse=True): source=source[:a]+text+source[b:]
        if source!=path.read_text(): path.write_text(source)
if __name__=='__main__': sync()
