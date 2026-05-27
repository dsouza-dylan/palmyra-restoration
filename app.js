/* app.js — Palmyra Scrollytelling */

const GENUS_NAMES = new Set(["Acropora","Montipora","Pocillopora","Lobophora","Peyssonnelia"]);
function italicOrg(name) {
  return GENUS_NAMES.has(name) ? `<i>${name}</i>` : name;
}

// ── 0. HERO BACKGROUND MAP ──
const heroMap = L.map('hero-map', {
  center: [5, -160],
  zoom: 3,
  zoomControl: false,
  attributionControl: false,
  scrollWheelZoom: false,
  dragging: false,
  touchZoom: false,
  doubleClickZoom: false,
  keyboard: false,
});

L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  { maxZoom: 18 }
).addTo(heroMap);

L.circleMarker([5.88, -162.08], {
  radius: 4,
  color: '#22d3ee',
  fillColor: '#22d3ee',
  fillOpacity: 1,
  weight: 2,
}).addTo(heroMap);

// ── 1. LEAFLET MAP ──
const leafletMap = L.map('leaflet-map', {
  center: [20, -30],
  zoom: 2,
  zoomControl: false,
  attributionControl: false,
  scrollWheelZoom: false,
  dragging: false,
});

L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  { maxZoom: 18 }
).addTo(leafletMap);

// Custom scale bar
const scaleEl = document.createElement('div');
scaleEl.id = 'map-scale';
document.getElementById('map-sticky-panel').appendChild(scaleEl);

function updateScale() {
  const mid = leafletMap.getSize().y / 2;
  const p1 = leafletMap.containerPointToLatLng([0, mid]);
  const p2 = leafletMap.containerPointToLatLng([187, mid]);
  const miles = leafletMap.distance(p1, p2) / 1609.344;
  const label = miles >= 1
    ? miles.toFixed(0) + ' mi'
    : (miles * 5280).toFixed(0) + ' ft';
  scaleEl.innerHTML = `<div class="scale-bar"></div><span class="scale-label">${label}</span>`;
}

leafletMap.on('zoomend moveend', updateScale);
leafletMap.whenReady(updateScale);

const palmyraIcon = L.divIcon({
  className: '',
  html: `<div class="palmyra-marker">
    <div class="ring"></div><div class="ring ring2"></div>
    <div class="dot"></div>
    <span class="palmyra-label">Palmyra Atoll</span>
  </div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const palmyraMarker = L.marker([5.88, -162.08], { icon: palmyraIcon })
  .addTo(leafletMap);

const wreckIcon = L.divIcon({
  className: '',
  html: '<div class="wreck-marker"><div class="wreck-pulse"></div><div class="wreck-pulse wp2"></div>★<span class="wreck-label">Wreck site</span></div>',
  iconSize: [120, 80],
  iconAnchor: [60, 40],
});
const wreckMarker = L.marker([5.876, -162.11], { icon: wreckIcon })
  .addTo(leafletMap);

function showWreck() {
  wreckMarker.getElement()?.querySelector('.wreck-marker')?.classList.add('visible');
}
function hideWreck() {
  wreckMarker.getElement()?.querySelector('.wreck-marker')?.classList.remove('visible');
}

let mapFullyZoomed = false;

// Map scroll steps
const MAP_VIEWS = {
  'pacific-intro': { center: [5.88, -162.08], zoom: 3,  duration: 2.2 },
  'palmyra':       { center: [5.88, -162.08], zoom: window.innerWidth < 860 ? 12 : 13, duration: 0   },
};

const mapScroller = scrollama();
mapScroller.setup({ step: '.map-step', offset: 0.5 })
  .onStepEnter(({ element, direction }) => {
    document.querySelectorAll('.map-step').forEach(s => s.classList.remove('is-active'));
    element.classList.add('is-active');
    if (element.dataset.map === 'palmyra') {
      showWreck();
    }
    if (direction === 'up') return;
    if (mapFullyZoomed) return;
    const view = MAP_VIEWS[element.dataset.map];
    if (view && view.duration > 0) {
      leafletMap.stop();
      leafletMap.flyTo(view.center, view.zoom, { duration: view.duration, easeLinearity: 0.3 });
    }
  })
  .onStepExit(({ element, direction }) => {
    if (element.dataset.map === 'corallimorph') {
      hideWreck();
    }
    if (direction === 'up' && element.dataset.map === 'opportunity') {
      showWreck();
    }
    if (direction === 'up' && element.dataset.map === 'palmyra') {
      hideWreck();
    }
    if (direction === 'up' && element.dataset.map === 'pacific-intro') {
      element.classList.remove('is-active');
    }
  });


// ── 2. MAIN DATA CHART (Real data, progressive reveal, ±SE ribbons) ──
const dataEl = document.getElementById('data-chart');
const DW = dataEl.getBoundingClientRect().width  || 520;
const DH = dataEl.getBoundingClientRect().height || 320;
const dm = { top: 18, right: 28, bottom: 42, left: 48 };
const diW = DW - dm.left - dm.right;
const diH = DH - dm.top  - dm.bottom;

const dataSvg = d3.select('#data-chart')
  .attr('viewBox', `0 0 ${DW} ${DH}`)
  .attr('preserveAspectRatio', 'xMidYMid meet');

const dataG = dataSvg.append('g')
  .attr('transform', `translate(${dm.left},${dm.top})`);

const dxSc = d3.scaleTime()
  .domain([REAL_DATES[0], REAL_DATES[REAL_DATES.length - 1]])
  .range([0, diW]);

const dySc = d3.scaleLinear().domain([0, 48]).range([diH, 0]);

dataG.append('g').attr('class', 'axis')
  .attr('transform', `translate(0,${diH})`)
  .call(d3.axisBottom(dxSc).ticks(d3.timeYear.every(2)).tickFormat(d3.utcFormat('%Y')));

dataG.append('g').attr('class', 'axis')
  .call(d3.axisLeft(dySc).ticks(5).tickFormat(d => d + '%'));

dySc.ticks(5).forEach(t => {
  dataG.append('line')
    .attr('x1', 0).attr('x2', diW)
    .attr('y1', dySc(t)).attr('y2', dySc(t))
    .style('stroke', 'rgba(255,255,255,0.04)');
});

dataSvg.append('text')
  .attr('transform', 'rotate(-90)')
  .attr('x', -(DH / 2)).attr('y', 14)
  .attr('text-anchor', 'middle')
  .style('fill', '#6b85a6').style('font-size', '10px')
  .text('Percent cover');

// Bleach elements — positioned at the 2023-10-01 survey
const bX = dxSc(new Date("2023-10-01"));

const bleachLine = dataG.append('line')
  .attr('x1', bX).attr('x2', bX).attr('y1', 0).attr('y2', diH)
  .style('stroke', '#ef4444').style('stroke-width', 1)
  .style('stroke-dasharray', '3 3').style('opacity', 0);

const bleachTxt = dataG.append('text')
  .attr('transform', `translate(${bX - 7}, ${diH * 0.38}) rotate(-90)`)
  .attr('text-anchor', 'middle')
  .style('fill', '#ef4444').style('font-family', "'Space Mono', monospace")
  .style('font-size', '7.5px').style('letter-spacing', '0.08em')
  .style('opacity', 0)
  .text('BLEACHING EVENT');

const bleachRect = dataG.append('rect')
  .attr('x', bX).attr('y', 0)
  .attr('width', Math.max(0, diW - bX)).attr('height', diH)
  .style('fill', '#ef4444').style('opacity', 0);

// Error bars, lines, dots groups (order matters for layering)
const dataErrG  = dataG.append('g');
const dataLinesG = dataG.append('g');
const dataDotsG  = dataG.append('g');

// Legend
function buildDataLegend() {
  const leg = document.getElementById('data-legend');
  leg.innerHTML = '';
  TREATMENTS.forEach(trt => {
    const meta = TREATMENT_META[trt];
    leg.insertAdjacentHTML('beforeend', `
      <div class="legend-item">
        <div class="legend-swatch" style="background:${meta.color}"></div>
        <span>${meta.label}</span>
      </div>`);
  });
}
buildDataLegend();

// Step configs using real date indices
const DATA_STEPS = {
  baseline: { maxIdx: STEP_DATE_IDX.baseline,  bleach: false },
  early:    { maxIdx: STEP_DATE_IDX.early,     bleach: false },
  peak:     { maxIdx: STEP_DATE_IDX.bleaching, bleach: false }, // show Oct 2023 peak, no overlay yet
  bleaching:{ maxIdx: STEP_DATE_IDX.bleaching, bleach: true  }, // same data, bleach floods in
  full:     { maxIdx: STEP_DATE_IDX.full,      bleach: true  },
};

function renderDataChart(stepKey, animate = true) {
  const { maxIdx, bleach } = DATA_STEPS[stepKey] || DATA_STEPS.full;
  const dur = animate ? 700 : 0;

  const lineGen = d3.line()
    .x(d => dxSc(d.date))
    .y(d => dySc(d.mean))
    .curve(d3.curveLinear);

  TREATMENTS.forEach(trt => {
    const meta = TREATMENT_META[trt];

    // Build data up to maxIdx, skip null means
    const tData = REAL_DATES.slice(0, maxIdx + 1)
      .map((date, i) => ({
        date,
        mean: ALLCORAL_MEANS[trt][i],
        se:   ALLCORAL_SE[trt][i],
      }))
      .filter(d => d.mean !== null);

    // Error bars (vertical line + caps at ±SE)
    const capW = 4;
    const errData = tData.filter(d => d.se > 0);
    const errBars = dataErrG.selectAll(`.deb-${trt}`).data(errData, d => d.date);
    const errEnter = errBars.enter().append('g').attr('class', `deb-${trt}`);
    errEnter.append('line').attr('class', 'err-stem');
    errEnter.append('line').attr('class', 'err-cap-top');
    errEnter.append('line').attr('class', 'err-cap-bot');

    const errAll = errEnter.merge(errBars);
    errAll.transition().duration(dur)
      .attr('transform', d => `translate(${dxSc(d.date)},0)`);
    errAll.select('.err-stem')
      .transition().duration(dur)
      .attr('x1', 0).attr('x2', 0)
      .attr('y1', d => dySc(Math.max(0, d.mean - d.se)))
      .attr('y2', d => dySc(d.mean + d.se))
      .attr('stroke', meta.color).attr('stroke-width', 1.2).attr('opacity', 0.30);
    errAll.select('.err-cap-top')
      .transition().duration(dur)
      .attr('x1', -capW).attr('x2', capW)
      .attr('y1', d => dySc(d.mean + d.se))
      .attr('y2', d => dySc(d.mean + d.se))
      .attr('stroke', meta.color).attr('stroke-width', 1.2).attr('opacity', 0.30);
    errAll.select('.err-cap-bot')
      .transition().duration(dur)
      .attr('x1', -capW).attr('x2', capW)
      .attr('y1', d => dySc(Math.max(0, d.mean - d.se)))
      .attr('y2', d => dySc(Math.max(0, d.mean - d.se)))
      .attr('stroke', meta.color).attr('stroke-width', 1.2).attr('opacity', 0.30);
    errBars.exit().remove();

    // Line
    let line = dataLinesG.select(`.dl-${trt}`);
    if (line.empty()) {
      line = dataLinesG.append('path')
        .attr('class', `treatment-line dl-${trt}`)
        .attr('stroke', meta.color)
        .style('opacity', 0);
    }
    line.datum(tData).transition().duration(dur)
      .attr('d', lineGen)
      .style('opacity', tData.length ? 1 : 0);

    // Dots
    const dots = dataDotsG.selectAll(`.dd-${trt}`).data(tData);
    const dotsEnter = dots.enter().append('circle')
      .attr('class', `data-dot dd-${trt}`)
      .attr('r', 4.5).attr('fill', meta.color)
      .attr('stroke', 'var(--bg)').attr('stroke-width', 1.5)
      .style('opacity', 0)
      .style('cursor', 'crosshair');

    const dotsAll = dotsEnter.merge(dots);
    dotsAll
      .on('mouseenter', function(event, d) {
        const tt = document.getElementById('chart-tooltip');
        tt.innerHTML = `
          <div class="tt-treatment" style="color:${meta.color}">${meta.fullLabel}</div>
          <div class="tt-date">${d.date.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })}</div>
          <div class="tt-val">${d.mean.toFixed(1)}% <span style="color:var(--muted)">± ${d.se.toFixed(1)} SE</span></div>`;
        tt.classList.add('visible');
        d3.select(this).attr('r', 6.5);
      })
      .on('mousemove', function(event) {
        const tt = document.getElementById('chart-tooltip');
        tt.style.left = (event.clientX + 14) + 'px';
        tt.style.top  = (event.clientY - 36) + 'px';
      })
      .on('mouseleave', function() {
        document.getElementById('chart-tooltip').classList.remove('visible');
        d3.select(this).attr('r', 4.5);
      });

    dotsAll.transition().duration(dur)
      .attr('cx', d => dxSc(d.date))
      .attr('cy', d => dySc(d.mean))
      .style('opacity', 1);
    dots.exit().transition().duration(dur).style('opacity', 0).remove();
  });

  bleachRect.transition().duration(dur).style('opacity', bleach ? 0.05 : 0);
  bleachLine.transition().duration(dur).style('opacity', bleach ? 1 : 0);
  bleachTxt.transition().duration(dur).style('opacity', bleach ? 1 : 0);
}

// Data scrollama
const dataScroller = scrollama();
dataScroller.setup({ step: '#data-steps .step', offset: 0.5 })
  .onStepEnter(({ element }) => {
    document.querySelectorAll('#data-steps .step').forEach(s => s.classList.remove('is-active'));
    element.classList.add('is-active');
    renderDataChart(element.dataset.step);
  });

// Hide sticky header when data section leaves viewport
const dataScrollHdr = document.getElementById('data-scroll-header');
new IntersectionObserver(entries => {
  entries.forEach(e => {
    dataScrollHdr.style.opacity = e.isIntersecting ? '1' : '0';
    dataScrollHdr.style.pointerEvents = e.isIntersecting ? '' : 'none';
  });
}, { threshold: 0 }).observe(document.getElementById('data-scroll'));


// ── 3. SANDBOX CHART ──
const sbEl = document.getElementById('sandbox-chart');
const SW = Math.min(sbEl.getBoundingClientRect().width || 800, 800);
const SH = 437;
const sm = { top: 18, right: 28, bottom: 42, left: 48 };
const siW = SW - sm.left - sm.right;
const siH = SH - sm.top  - sm.bottom;

const sbSvg = d3.select('#sandbox-chart')
  .attr('viewBox', `0 0 ${SW} ${SH}`)
  .attr('preserveAspectRatio', 'xMidYMid meet');

const sbG = sbSvg.append('g').attr('transform', `translate(${sm.left},${sm.top})`);

const sbX = d3.scaleTime()
  .domain([SURVEY_DATES[0], SURVEY_DATES[SURVEY_DATES.length - 1]])
  .range([0, siW]);

const sbY = d3.scaleLinear().range([siH, 0]);

const sbXG = sbG.append('g').attr('class', 'axis').attr('transform', `translate(0,${siH})`);
const sbYG = sbG.append('g').attr('class', 'axis');

// Bleach shading (always shown in sandbox)
const sbBX = sbX(BLEACH_DATE);
sbG.append('rect')
  .attr('x', sbBX).attr('y', 0)
  .attr('width', Math.max(0, siW - sbBX)).attr('height', siH)
  .style('fill', '#ef4444').style('opacity', 0.05);
sbG.append('line')
  .attr('x1', sbBX).attr('x2', sbBX).attr('y1', 0).attr('y2', siH)
  .style('stroke', '#ef4444').style('stroke-width', 1)
  .style('stroke-dasharray', '3 3').style('opacity', 1);
sbG.append('text')
  .attr('transform', `translate(${sbBX - 7}, ${siH * 0.38}) rotate(-90)`)
  .attr('text-anchor', 'middle')
  .style('fill', '#ef4444').style('font-family', "'Space Mono', monospace")
  .style('font-size', '7.5px').style('letter-spacing', '0.08em')
  .text('BLEACHING EVENT');

sbSvg.append('text')
  .attr('transform', 'rotate(-90)').attr('x', -(SH / 2)).attr('y', 14)
  .attr('text-anchor', 'middle')
  .style('fill', '#6b85a6').style('font-size', '10px')
  .text('Percent cover');

const sbErrG   = sbG.append('g');
const sbLinesG = sbG.append('g');
const sbDotsG  = sbG.append('g');
const sbGridG  = sbG.append('g');

// Sandbox state
let sbState = {
  organism: 'All Coral',
  treatments: new Set(TREATMENTS),
};

function renderSandbox(animate = true) {
  const dur = animate ? 500 : 0;
  const data = buildLineData(sbState.organism);
  const vis  = sbState.treatments;

  const orgDisplayName = sbState.organism === 'CCA' ? 'Crustose Coralline Algae (CCA)' : italicOrg(sbState.organism);
  document.getElementById('sandbox-chart-title').innerHTML = orgDisplayName;

  const vals = data.filter(d => vis.has(d.treatment)).map(d => d.mean);
  const yMax = (d3.max(vals) || 30) * 1.12;
  sbY.domain([0, yMax]);

  sbXG.transition().duration(dur).call(
    d3.axisBottom(sbX).ticks(d3.timeYear.every(2)).tickFormat(d3.utcFormat('%Y'))
  );
  sbYG.transition().duration(dur).call(
    d3.axisLeft(sbY).ticks(5).tickFormat(d => d + '%')
  );

  sbGridG.selectAll('line').remove();
  sbGridG.selectAll('line').data(sbY.ticks(5)).enter().append('line')
    .attr('x1', 0).attr('x2', siW)
    .attr('y1', d => sbY(d)).attr('y2', d => sbY(d))
    .style('stroke', 'rgba(255,255,255,0.04)');

  const lineGen = d3.line()
    .x(d => sbX(d.date))
    .y(d => sbY(d.mean))
    .curve(d3.curveLinear);

  TREATMENTS.forEach(trt => {
    const meta  = TREATMENT_META[trt];
    const tData = data.filter(d => d.treatment === trt);
    const isVis = vis.has(trt);

    // Error bars
    const capW   = 4;
    const errData = isVis ? tData.filter(d => d.se > 0) : [];
    const errBars = sbErrG.selectAll(`.seb-${trt}`).data(errData, d => d.date);
    const errEnter = errBars.enter().append('g').attr('class', `seb-${trt}`);
    errEnter.append('line').attr('class', 'err-stem');
    errEnter.append('line').attr('class', 'err-cap-top');
    errEnter.append('line').attr('class', 'err-cap-bot');
    const errAll = errEnter.merge(errBars);
    errAll.transition().duration(dur)
      .attr('transform', d => `translate(${sbX(d.date)},0)`);
    errAll.select('.err-stem').transition().duration(dur)
      .attr('x1', 0).attr('x2', 0)
      .attr('y1', d => sbY(Math.max(0, d.mean - d.se)))
      .attr('y2', d => sbY(d.mean + d.se))
      .attr('stroke', meta.color).attr('stroke-width', 1.2).attr('opacity', 0.30);
    errAll.select('.err-cap-top').transition().duration(dur)
      .attr('x1', -capW).attr('x2', capW)
      .attr('y1', d => sbY(d.mean + d.se)).attr('y2', d => sbY(d.mean + d.se))
      .attr('stroke', meta.color).attr('stroke-width', 1.2).attr('opacity', 0.30);
    errAll.select('.err-cap-bot').transition().duration(dur)
      .attr('x1', -capW).attr('x2', capW)
      .attr('y1', d => sbY(Math.max(0, d.mean - d.se)))
      .attr('y2', d => sbY(Math.max(0, d.mean - d.se)))
      .attr('stroke', meta.color).attr('stroke-width', 1.2).attr('opacity', 0.30);
    errBars.exit().remove();

    let line = sbLinesG.select(`.sl-${trt}`);
    if (line.empty()) {
      line = sbLinesG.append('path')
        .attr('class', `treatment-line sl-${trt}`)
        .attr('stroke', meta.color)
        .style('opacity', 0);
    }
    line.datum(tData).transition().duration(dur)
      .attr('d', lineGen)
      .style('opacity', isVis ? 1 : 0);

    const sbDots = sbDotsG.selectAll(`.sd-${trt}`).data(isVis ? tData : []);
    const sbDotsEnter = sbDots.enter().append('circle')
      .attr('class', `data-dot sd-${trt}`)
      .attr('r', 4.5).attr('fill', meta.color)
      .attr('stroke', 'var(--bg)').attr('stroke-width', 1.5)
      .style('opacity', 0).style('cursor', 'crosshair');

    const sbDotsAll = sbDotsEnter.merge(sbDots);
    sbDotsAll
      .on('mouseenter', function(event, d) {
        const tt = document.getElementById('chart-tooltip');
        tt.innerHTML = `
          <div class="tt-treatment" style="color:${meta.color}">${meta.fullLabel}</div>
          <div class="tt-date">${d.date.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })}</div>
          <div class="tt-val">${d.mean.toFixed(1)}% <span style="color:var(--muted)">± ${d.se.toFixed(1)} SE</span></div>`;
        tt.classList.add('visible');
        d3.select(this).attr('r', 6.5);
      })
      .on('mousemove', function(event) {
        const tt = document.getElementById('chart-tooltip');
        tt.style.left = (event.clientX + 14) + 'px';
        tt.style.top  = (event.clientY - 36) + 'px';
      })
      .on('mouseleave', function() {
        document.getElementById('chart-tooltip').classList.remove('visible');
        d3.select(this).attr('r', 4.5);
      });

    sbDotsAll.transition().duration(dur)
      .attr('cx', d => sbX(d.date))
      .attr('cy', d => sbY(d.mean))
      .style('opacity', 1);
    sbDots.exit().transition().duration(dur).style('opacity', 0).remove();
  });

  // Legend
  const leg = document.getElementById('sandbox-legend');
  leg.innerHTML = '';
  TREATMENTS.forEach(trt => {
    if (!vis.has(trt)) return;
    const meta = TREATMENT_META[trt];
    leg.insertAdjacentHTML('beforeend', `
      <div class="legend-item">
        <div class="legend-swatch" style="background:${meta.color}"></div>
        <span>${meta.label}</span>
      </div>`);
  });
}

// Organism pills
document.getElementById('org-pills').addEventListener('click', e => {
  const btn = e.target.closest('[data-org]');
  if (!btn) return;
  document.querySelectorAll('#org-pills .pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  sbState.organism = btn.dataset.org;
  renderSandbox();
});

// Treatment pills
document.getElementById('trt-pills').addEventListener('click', e => {
  const btn = e.target.closest('[data-trt]');
  if (!btn) return;
  const trt = btn.dataset.trt;
  if (sbState.treatments.has(trt)) {
    if (sbState.treatments.size === 1) return; // keep at least one
    sbState.treatments.delete(trt);
    btn.classList.remove('active');
  } else {
    sbState.treatments.add(trt);
    btn.classList.add('active');
  }
  renderSandbox();
});


// ── 4. COMMUNITY STACKED BAR ──
const commW = 1000, commH = 391;
const cm = { top: 18, right: 20, bottom: 56, left: 50 };
const cW = commW - cm.left - cm.right;
const cH = commH - cm.top  - cm.bottom;

const commSvg = d3.select('#community-chart')
  .attr('viewBox', `0 0 ${commW} ${commH}`)
  .attr('preserveAspectRatio', 'xMidYMid meet');

const commG = commSvg.append('g')
  .attr('transform', `translate(${cm.left},${cm.top})`);

const xBand = d3.scaleBand()
  .domain(TREATMENTS).range([0, cW]).padding(0.28);

const yComm = d3.scaleLinear().domain([0, 100]).range([cH, 0]);

commG.append('g').attr('class', 'axis')
  .attr('transform', `translate(0,${cH})`)
  .call(d3.axisBottom(xBand))
  .selectAll('.tick text')
  .style('fill', d => TREATMENT_META[d]?.color || 'var(--muted)')
  .style('font-weight', '600');

commG.append('g').attr('class', 'axis')
  .call(d3.axisLeft(yComm).ticks(5).tickFormat(d => d + '%'));

commSvg.append('text')
  .attr('x', commW / 2).attr('y', commH - 4)
  .attr('text-anchor', 'middle')
  .style('fill', '#6b85a6').style('font-size', '10px')
  .text('Treatment');

commSvg.append('text')
  .attr('transform', 'rotate(-90)')
  .attr('x', -(commH / 2)).attr('y', 14)
  .attr('text-anchor', 'middle')
  .style('fill', '#6b85a6').style('font-size', '10px')
  .text('Percent cover');

function renderCommunityChart(dateIndex) {
  const date   = REAL_DATES[dateIndex];
  const isBleach = date >= BLEACH_DATE;

  const barData = TREATMENTS.map(trt => {
    const row = { treatment: trt };
    STACK_ORDER.forEach(org => { row[org] = REAL_MEANS[org]?.[trt]?.[dateIndex] ?? 0; });
    return row;
  });

  const stack = d3.stack().keys(STACK_ORDER)(barData);

  // Flatten for keyed join: one rect per (treatment, organism)
  const flatData = [];
  stack.forEach(layer => {
    layer.forEach(d => {
      flatData.push({ key: `${d.data.treatment}-${layer.key}`, org: layer.key, d });
    });
  });

  const segs = commG.selectAll('.bar-seg').data(flatData, d => d.key);

  const merged = segs.enter().append('rect')
    .attr('class', 'bar-seg')
    .attr('x', d => xBand(d.d.data.treatment))
    .attr('width', xBand.bandwidth())
    .attr('fill', d => STACK_COLORS[d.org])
    .attr('rx', 1)
    .attr('y', yComm(0))
    .attr('height', 0)
    .style('cursor', 'crosshair')
  .merge(segs);

  merged
    .on('mouseenter', function(event, d) {
      const val = d.d[1] - d.d[0];
      const tt = document.getElementById('chart-tooltip');
      tt.innerHTML = `
        <div class="tt-treatment" style="color:${STACK_COLORS[d.org]}">${d.org}</div>
        <div class="tt-date">${TREATMENT_META[d.d.data.treatment].fullLabel}</div>
        <div class="tt-val">${val.toFixed(1)}%</div>`;
      tt.classList.add('visible');
    })
    .on('mousemove', function(event) {
      const tt = document.getElementById('chart-tooltip');
      tt.style.left = (event.clientX + 14) + 'px';
      tt.style.top  = (event.clientY - 36) + 'px';
    })
    .on('mouseleave', function() {
      document.getElementById('chart-tooltip').classList.remove('visible');
    });

  merged.transition().duration(400).ease(d3.easeCubicOut)
    .attr('x', d => xBand(d.d.data.treatment))
    .attr('width', xBand.bandwidth())
    .attr('y', d => yComm(d.d[1]))
    .attr('height', d => Math.max(0, yComm(d.d[0]) - yComm(d.d[1])));

  segs.exit().transition().duration(300).attr('height', 0).attr('y', yComm(0)).remove();

  // Bleach overlay
  commG.selectAll('.bleach-ind').remove();
  if (isBleach) {
    commG.insert('rect', ':first-child')
      .attr('class', 'bleach-ind')
      .attr('x', 0).attr('y', 0)
      .attr('width', cW).attr('height', cH)
      .style('fill', '#ef4444').style('opacity', 0.06)
      .style('pointer-events', 'none');
  }
}

// Community legend
function buildCommLegend() {
  const leg = document.getElementById('community-legend');
  leg.innerHTML = '';
  LEGEND_ORDER.forEach(org => {
    leg.insertAdjacentHTML('beforeend', `
      <div class="legend-item">
        <div class="legend-swatch" style="background:${STACK_COLORS[org]}"></div>
        <span>${italicOrg(org === 'Other Non-Coral' ? 'Other' : org)}</span>
      </div>`);
  });
}
buildCommLegend();

const slider = document.getElementById('date-slider');
const sliderLabel = document.getElementById('slider-date-label');
function updateSlider() {
  const i = +slider.value;
  const isBleach = i >= 9;
  sliderLabel.textContent = REAL_DATES[i].toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  sliderLabel.style.color = isBleach ? '#ef4444' : '';
  slider.classList.toggle('bleaching', isBleach);
  renderCommunityChart(i);
}
slider.addEventListener('input', updateSlider);
updateSlider();


// ── 4. INIT ──
function applyDataHeaderOffset() {
  const hdr = document.getElementById('data-scroll-header');
  const panel = document.getElementById('data-chart-panel');
  if (!hdr || !panel) return;
  const h = hdr.getBoundingClientRect().height;
  panel.style.top = h + 'px';
  panel.style.height = `calc(100vh - ${h}px)`;
}
applyDataHeaderOffset();
window.addEventListener('resize', applyDataHeaderOffset);

renderDataChart('baseline', false);
renderSandbox(false);

// Activate first steps
document.querySelector('.map-step')?.classList.add('is-active');
document.querySelector('#data-steps .step')?.classList.add('is-active');

const paraScroller = scrollama();
paraScroller.setup({ step: '.para-trigger', offset: 0.85 })
  .onStepEnter(() => {
    document.querySelector('.para-reveal').classList.add('visible');
    palmyraMarker.remove();
    if (!mapFullyZoomed) {
      leafletMap.stop();
      leafletMap.flyTo([5.88, -162.08], window.innerWidth < 860 ? 12 : 13.7, { duration: 2.5, easeLinearity: 0.3 });
      mapFullyZoomed = true;
    }
  })
  .onStepExit(() => {});

window.addEventListener('resize', () => {
  mapScroller.resize();
  dataScroller.resize();
  paraScroller.resize();
});

// ── LIGHTBOX ──
const lightbox     = document.getElementById('lightbox');
const lightboxImg  = document.getElementById('lightbox-img');
const lightboxClose = document.getElementById('lightbox-close');
const lightboxBack  = document.getElementById('lightbox-backdrop');

function openLightbox(src, alt) {
  lightboxImg.src = src;
  lightboxImg.alt = alt || '';
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

lightboxClose.addEventListener('click', closeLightbox);
lightboxBack.addEventListener('click', closeLightbox);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

// Wire up all <img> elements
document.querySelectorAll('.step-fig img, .methods-fig img').forEach(img => {
  img.classList.add('expandable');
  img.addEventListener('click', () => openLightbox(img.src, img.alt));
});

// Wire up treatment card background images
document.querySelectorAll('.tcard-img').forEach(card => {
  card.classList.add('expandable');
  card.addEventListener('click', () => {
    const url = card.style.backgroundImage.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
    if (url) openLightbox(url, '');
  });
});
