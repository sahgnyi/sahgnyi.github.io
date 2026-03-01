interface P { title: string; permalink: string; matchCount: number }
const esc = (s: string) => s.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
const eh = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

class Search {
    private data: P[];
    private form: HTMLFormElement;
    private input: HTMLInputElement;
    private list: HTMLDivElement;
    private rt: HTMLHeadingElement;
    private tpl: string;

    constructor({ form, input, list, resultTitle, resultTitleTemplate }) {
        this.form = form; this.input = input; this.list = list;
        this.rt = resultTitle; this.tpl = resultTitleTemplate;
        this.input.value.trim() ? this.doSearch(this.input.value.trim()) : this.fromQS();
        window.addEventListener('popstate', () => this.fromQS());
        let last = '';
        const h = (e) => {
            e.preventDefault();
            const k = this.input.value.trim();
            this.setQS(k);
            if (!k) { last = ''; this.clear(); return }
            if (last === k) return;
            last = k; this.doSearch(k);
        };
        this.input.addEventListener('input', h);
        this.input.addEventListener('compositionend', h);
    }

    private async doSearch(kw: string) {
        const t = performance.now();
        const d = await this.getData();
        const re = new RegExp(kw.split(/\s+/).filter(Boolean).map(esc).join('|'), 'gi');
        const r: P[] = [];
        for (const item of d) {
            const m = Array.from(item.title.matchAll(re));
            if (!m.length) continue;
            let h = '', li = 0;
            for (const x of m) { h += eh(item.title.substring(li, x.index)) + `<mark>${eh(x[0])}</mark>`; li = x.index + x[0].length }
            h += eh(item.title.substring(li));
            r.push({ ...item, title: h, matchCount: m.length });
        }
        r.sort((a, b) => b.matchCount - a.matchCount);
        this.clear();
        for (const i of r) this.list.append(Search.render(i));
        this.rt.innerText = this.tpl.replace("#PAGES_COUNT", String(r.length)).replace("#TIME_SECONDS", ((performance.now() - t) / 1000).toPrecision(1));
    }

    private async getData() {
        if (!this.data) this.data = await fetch(this.form.dataset.json).then(r => r.json());
        return this.data;
    }

    private clear() { this.list.innerHTML = ''; this.rt.innerText = '' }

    private fromQS() {
        const k = new URL(location.toString()).searchParams.get('keyword');
        this.input.value = k || '';
        k ? this.doSearch(k) : this.clear();
    }

    private setQS(k: string) {
        const u = new URL(location.toString());
        k ? u.searchParams.set('keyword', k) : u.searchParams.delete('keyword');
        history.replaceState('', '', u.toString());
    }

    static render(item: P) {
        return <article><a href={item.permalink}><div class="article-details"><h2 class="article-title" dangerouslySetInnerHTML={{ __html: item.title }}></h2></div></a></article>;
    }
}

window.addEventListener('load', () => {
    setTimeout(() => {
        const f = document.querySelector('.search-form') as HTMLFormElement;
        new Search({ form: f, input: f.querySelector('input'), list: document.querySelector('.search-result--list'), resultTitle: document.querySelector('.search-result--title'), resultTitleTemplate: (window as any).searchResultTitleTemplate });
    }, 0);
});
export default Search;
