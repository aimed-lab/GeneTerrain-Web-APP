def funcMaxDifference(l):
    r = 0
    m = l[0]
    for i in range(1,len(l)):
        if l[i]>m:
            r = max(r, l[i]-m)
        m = min(m, l[i])
    return r


def funcDrop(x,y):
    m = max(x.count(max(set(x), key=x.count)),
                y.count(max(set(y), key=y.count)))
    if m==1:
        return 0
    return m

def funcSubstring(s):
    n = len(s)
    result = ""
    for i in range(n):
        for j in range(i, n):
            sub = s[i:j+1]
            if sub == sub[::-1]:
                if len(sub) > len(result) or (len(sub) == len(result) and sub < result):
                    result = sub
    return result

print(funcMaxDifference([4,3,1]))
    
        