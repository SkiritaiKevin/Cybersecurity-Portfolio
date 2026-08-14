# Kevin Beideman's Cybersecurity Portfolio

Source code for my personal cybersecurity portfolio, hosted on Neocities at
[kbeideman.neocities.org](https://kbeideman.neocities.org/).

The site presents hands-on security labs, research, software projects, technical
leadership, and personal writing. Featured work includes an enterprise Active
Directory security lab, generative AI and cybersecurity research, network
optimization research, and the LRG team-composition website.

## Stack

- Semantic HTML
- Responsive CSS
- Vanilla JavaScript
- Static hosting on Neocities

## Local Preview

Run a static server from the repository root and open `index.html`:

```powershell
python -m http.server 8135 --bind 127.0.0.1
```

Then visit `http://127.0.0.1:8135/`.

## Structure

- `index.html` - homepage
- `projects.html` - work archive
- `about.html` - background and technical direction
- `blog.html` - personal writing
- `active-directory-lab.html` - completed AD security case study
- `summer_research_*.html` - published and ongoing research
- `pictures/` - site imagery
- `style.css` and `script.js` - shared styling and behavior
