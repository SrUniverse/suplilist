import pathlib
files=['data.js','scripts.js']
for fname in files:
    p=pathlib.Path(fname).read_text(encoding='utf-8')
    counts={'(':0,')':0,'[':0,']':0,'{':0,'}':0}
    in_single=in_double=in_template=escaped=False
    for ch in p:
        if escaped:
            escaped=False
            continue
        if ch=='\\':
            escaped=True
            continue
        if in_single:
            if ch=="'":
                in_single=False
            continue
        if in_double:
            if ch=='"':
                in_double=False
            continue
        if in_template:
            if ch=='`':
                in_template=False
            continue
        if ch=="'":
            in_single=True
        elif ch=='"':
            in_double=True
        elif ch=='`':
            in_template=True
        elif ch in counts:
            counts[ch]+=1
    print(fname, counts)
