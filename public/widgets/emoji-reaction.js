if (typeof window != "undefined") {
  var an, pr, ln, _r;
  ((pr = (an = (_r = (ln = window).__svelte) !== null && _r !== void 0 ? _r : ln.__svelte = {}).v) !== null && pr !== void 0 ? pr : an.v = /* @__PURE__ */ new Set()).add("5");
}
var st = !1, _t = !1;
function Fi() {
  _t = !0;
}
Fi();
var Be = {}, V = /* @__PURE__ */ Symbol("uninitialized");
var Di = "http://www.w3.org/1999/xhtml", On = Array.isArray, Hi = Array.prototype.indexOf, Ct = Array.prototype.includes, ur = Array.from, Qt = Object.keys, Pt = Object.defineProperty, Ze = Object.getOwnPropertyDescriptor, jn = Object.getOwnPropertyDescriptors, Bi = Object.prototype, qi = Array.prototype, qr = Object.getPrototypeOf, on = Object.isExtensible, Ui = () => {
};
function Yi(e) {
  return e();
}
function Er(e) {
  for (var t = 0; t < e.length; t++) e[t]();
}
function Cn() {
  var e, t;
  return {
    promise: new Promise((r, n) => {
      e = r, t = n;
    }),
    resolve: e,
    reject: t
  };
}
function Rt(e) {
  "@babel/helpers - typeof";
  return Rt = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
    return typeof t;
  } : function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, Rt(e);
}
function Vi(e, t) {
  if (Rt(e) != "object" || !e) return e;
  var r = e[Symbol.toPrimitive];
  if (r !== void 0) {
    var n = r.call(e, t || "default");
    if (Rt(n) != "object") return n;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
function Ki(e) {
  var t = Vi(e, "string");
  return Rt(t) == "symbol" ? t : t + "";
}
function P(e, t, r) {
  return (t = Ki(t)) in e ? Object.defineProperty(e, t, {
    value: r,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : e[t] = r, e;
}
var gr, Va = 1 << 24, ce = 1024, ie = 2048, Ce = 4096, Ur = 8192, Pn = 16384, Yr = 32768, Sr = 1 << 25, Rn = 65536, Ka = 1 << 17, Ga = 1 << 18, gt = 1 << 19, Ln = 1 << 20, Tt = 1 << 25, fn = 1 << 21, Gi = 1 << 22, er = 1 << 23, vt = /* @__PURE__ */ Symbol("$state"), In = /* @__PURE__ */ Symbol("component"), Nn = /* @__PURE__ */ Symbol("legacy props"), Xi = /* @__PURE__ */ Symbol(""), Zi = /* @__PURE__ */ Symbol("proxy path"), Mr = /* @__PURE__ */ Symbol("attributes"), Tr = /* @__PURE__ */ Symbol("class"), Ji = /* @__PURE__ */ Symbol("style"), Gt = /* @__PURE__ */ Symbol("text"), Wt = new class extends Error {
  constructor(...t) {
    super(...t), P(this, "name", "StaleReactionError"), P(this, "message", "The reaction that called `getAbortSignal()` was re-run or destroyed");
  }
}(), Qi = !!(!((gr = globalThis.document) === null || gr === void 0) && gr.contentType) && /* @__PURE__ */ globalThis.document.contentType.includes("xml");
function es() {
  console.warn("https://svelte.dev/e/derived_inert");
}
function ts(e, t, r) {
  console.warn("https://svelte.dev/e/hydration_attribute_changed");
}
function cr(e) {
  console.warn("https://svelte.dev/e/hydration_mismatch");
}
function rs() {
  console.warn("https://svelte.dev/e/svelte_boundary_reset_noop");
}
var N = !1;
function Ke(e) {
  N = e;
}
var F;
function fe(e) {
  if (e === null)
    throw cr(), Be;
  return F = e;
}
function Vr() {
  return fe(/* @__PURE__ */ Pe(F));
}
function Ar(e) {
  if (N) {
    if (/* @__PURE__ */ Pe(F) !== null)
      throw cr(), Be;
    F = e;
  }
}
function ns(e = 1) {
  if (N) {
    for (var t = e, r = F; t--; ) r = /* @__PURE__ */ Pe(r);
    F = r;
  }
}
function Or(e = !0) {
  for (var t = 0, r = F; ; ) {
    if (r.nodeType === 8) {
      var n = r.data;
      if (n === "]") {
        if (t === 0) return r;
        t -= 1;
      } else (n === "[" || n === "[!" || n[0] === "[" && !isNaN(Number(n.slice(1)))) && (t += 1);
    }
    var i = /* @__PURE__ */ Pe(r);
    e && r.remove(), r = i;
  }
}
function zn(e) {
  if (!e || e.nodeType !== 8)
    throw cr(), Be;
  return e.data;
}
function Wn(e) {
  return e === this.v;
}
function is(e, t) {
  return e != e ? t == t : e !== t || e !== null && typeof e == "object" || typeof e == "function";
}
function Fn(e) {
  return !is(e, this.v);
}
function ss(e) {
  throw new Error("https://svelte.dev/e/lifecycle_outside_component");
}
function as() {
  throw new Error("https://svelte.dev/e/async_derived_orphan");
}
function ls(e, t, r) {
  throw new Error("https://svelte.dev/e/each_key_duplicate");
}
function os(e) {
  throw new Error("https://svelte.dev/e/effect_in_teardown");
}
function fs() {
  throw new Error("https://svelte.dev/e/effect_in_unowned_derived");
}
function us(e) {
  throw new Error("https://svelte.dev/e/effect_orphan");
}
function cs() {
  throw new Error("https://svelte.dev/e/effect_update_depth_exceeded");
}
function ds() {
  throw new Error("https://svelte.dev/e/hydration_failed");
}
function vs(e) {
  throw new Error("https://svelte.dev/e/props_invalid_value");
}
function hs() {
  throw new Error("https://svelte.dev/e/state_descriptors_fixed");
}
function ps() {
  throw new Error("https://svelte.dev/e/state_prototype_fixed");
}
function _s() {
  throw new Error("https://svelte.dev/e/state_unsafe_mutation");
}
function gs() {
  throw new Error("https://svelte.dev/e/svelte_boundary_reset_onerror");
}
function un(e, t) {
  return e.label = t, ms(e.v, t), e;
}
function ms(e, t) {
  var r;
  return e == null || (r = e[Zi]) === null || r === void 0 || r.call(e, t), e;
}
function cn(e, t) {
  var r = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    t && (n = n.filter(function(i) {
      return Object.getOwnPropertyDescriptor(e, i).enumerable;
    })), r.push.apply(r, n);
  }
  return r;
}
function te(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = arguments[t] != null ? arguments[t] : {};
    t % 2 ? cn(Object(r), !0).forEach(function(n) {
      P(e, n, r[n]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : cn(Object(r)).forEach(function(n) {
      Object.defineProperty(e, n, Object.getOwnPropertyDescriptor(r, n));
    });
  }
  return e;
}
var W = null;
function ht(e) {
  W = e;
}
function Dn(e, t = !1, r) {
  W = {
    p: W,
    i: !1,
    c: null,
    e: null,
    s: e,
    x: null,
    r: S,
    l: _t && !t ? {
      s: null,
      u: null,
      $: []
    } : null
  };
}
function Hn(e) {
  var t = W, r = t.e;
  if (r !== null) {
    t.e = null;
    for (var n of r) pi(n);
  }
  if (e !== void 0 && (t.x = e), t.i = !0, W = t.p, 0)
    var i;
  return Bn(e);
}
function Bn(e = {}) {
  return Pt(e, In, { value: !0 }), e;
}
function Ft() {
  return !_t || W !== null && W.l === null;
}
var Ge = [];
function qn() {
  var e = Ge;
  Ge = [], Er(e);
}
function Oe(e) {
  if (Ge.length === 0 && !At) {
    var t = Ge;
    queueMicrotask(() => {
      t === Ge && qn();
    });
  }
  Ge.push(e);
}
function ws() {
  for (; Ge.length > 0; ) qn();
}
var ys = ~(ie | Ce | ce);
function H(e, t) {
  e.f = e.f & ys | t;
}
function Kr(e) {
  (e.f & 512) !== 0 || e.deps === null ? H(e, ce) : H(e, Ce);
}
function Un(e, t) {
  (e.f & 2048) !== 0 ? t.set(e, ie) : (e.f & 4096) !== 0 && t.get(e) !== 2048 && t.set(e, Ce), H(e, ce);
}
function Dt(e) {
  var t = T, r = S;
  de(null), ve(null);
  try {
    return e();
  } finally {
    de(t), ve(r);
  }
}
function bs(e, t) {
  this.v = e, this.k = t;
}
function Ht(e) {
  var t, r;
  function n(s, a) {
    try {
      var l = e[s](a), f = l.value, u = f instanceof bs;
      Promise.resolve(u ? f.v : f).then(function(d) {
        if (u) {
          var c = s === "return" ? "return" : "next";
          if (!f.k || d.done) return n(c, d);
          d = e[c](d).value;
        }
        i(l.done ? "return" : "normal", d);
      }, function(d) {
        n("throw", d);
      });
    } catch (d) {
      i("throw", d);
    }
  }
  function i(s, a) {
    switch (s) {
      case "return":
        t.resolve({
          value: a,
          done: !0
        });
        break;
      case "throw":
        t.reject(a);
        break;
      default:
        t.resolve({
          value: a,
          done: !1
        });
    }
    (t = t.next) ? n(t.key, t.arg) : r = null;
  }
  this._invoke = function(s, a) {
    return new Promise(function(l, f) {
      var u = {
        key: s,
        arg: a,
        resolve: l,
        reject: f,
        next: null
      };
      r ? r = r.next = u : (t = r = u, n(s, a));
    });
  }, typeof e.return != "function" && (this.return = void 0);
}
Ht.prototype[typeof Symbol == "function" && Symbol.asyncIterator || "@@asyncIterator"] = function() {
  return this;
}, Ht.prototype.next = function(e) {
  return this._invoke("next", e);
}, Ht.prototype.throw = function(e) {
  return this._invoke("throw", e);
}, Ht.prototype.return = function(e) {
  return this._invoke("return", e);
};
function $s(e, t, r, n) {
  const i = Ft() ? Lt : Gr;
  var s = e.filter((h) => !h.settled), a = t.map(i);
  if (r.length === 0 && s.length === 0) {
    n(a);
    return;
  }
  var l = S, f = xs(), u = s.length === 1 ? s[0].promise : s.length > 1 ? Promise.all(s.map((h) => h.promise)) : null;
  function d(h) {
    if ((l.f & 16384) === 0) {
      f();
      try {
        n([...a, ...h]);
      } catch (g) {
        Me(g, l);
      }
      tr();
    }
  }
  var c = Yn();
  if (r.length === 0) {
    u.then(() => d([])).finally(c);
    return;
  }
  function v() {
    Promise.all(r.map((h) => /* @__PURE__ */ Es(h))).then(d).catch((h) => Me(h, l)).finally(c);
  }
  u ? u.then(() => {
    if ((l.f & 16384) !== 0) {
      c();
      return;
    }
    f(), v(), tr();
  }) : v();
}
function xs() {
  var e = S, t = T, r = W, n = k;
  if (0) var i;
  return function(a = !0) {
    ve(e), de(t), ht(r), a && (e.f & 16384) === 0 && (n == null || n.activate(), n == null || n.apply());
  };
}
var ks = !1;
function tr(e = !0) {
  ks = !1, ve(null), de(null), ht(null), e && (k == null || k.deactivate());
}
function Yn() {
  var e = S, t = e.b, r = k, n = !!(t != null && t.is_rendered());
  return t == null || t.update_pending_count(1, r), r.increment(n, e), () => {
    t == null || t.update_pending_count(-1, r), r.decrement(n, e);
  };
}
// @__NO_SIDE_EFFECTS__
function Lt(e) {
  var t = 2 | ie;
  return S !== null && (S.f |= gt), {
    ctx: W,
    deps: null,
    effects: null,
    equals: Wn,
    f: t,
    fn: e,
    reactions: null,
    rv: 0,
    v: V,
    wv: 0,
    parent: S,
    ac: null
  };
}
var xt = /* @__PURE__ */ Symbol("obsolete");
// @__NO_SIDE_EFFECTS__
function Es(e, t, r) {
  let n = S;
  n === null && as();
  var i = void 0, s = rt(V), a = !T, l = /* @__PURE__ */ new Set();
  return Vs(() => {
    var f = S, u = Cn();
    i = u.promise;
    try {
      Promise.resolve(e()).then(u.resolve, (_) => {
        _ !== Wt && u.reject(_);
      }).finally(tr);
    } catch (_) {
      u.reject(_), tr();
    }
    var d = k;
    if (a) {
      var c;
      if ((f.f & 32768) !== 0) var v = Yn();
      if (!((c = n.b) === null || c === void 0) && c.is_rendered()) {
        var h;
        (h = d.async_deriveds.get(f)) === null || h === void 0 || h.reject(xt);
      } else for (const _ of l.values()) _.reject(xt);
      l.add(u), d.async_deriveds.set(f, u);
    }
    const g = (_, p = void 0) => {
      v == null || v(), l.delete(u), p !== xt && (d.activate(), p ? (s.f |= er, pt(s, p)) : ((s.f & 8388608) !== 0 && (s.f ^= er), pt(s, _)), d.deactivate());
    };
    u.promise.then(g, (_) => g(null, _ || "unknown"));
  }), hi(() => {
    for (const f of l) f.reject(xt);
  }), new Promise((f) => {
    function u(d) {
      function c() {
        d === i ? f(s) : u(i);
      }
      d.then(c, c);
    }
    u(i);
  });
}
// @__NO_SIDE_EFFECTS__
function Gr(e) {
  const t = /* @__PURE__ */ Lt(e);
  return t.equals = Fn, t;
}
function Ss(e) {
  var t = e.effects;
  if (t !== null) {
    e.effects = null;
    for (var r = 0; r < t.length; r += 1) ue(t[r]);
  }
}
function Xr(e) {
  var t, r = S, n = e.parent;
  if (!je && n !== null && e.v !== V && (n.f & 24576) !== 0)
    return es(), e.v;
  ve(n);
  try {
    Ss(e), t = Si(e);
  } finally {
    ve(r);
  }
  return t;
}
function Vn(e) {
  var t = Xr(e);
  if (!e.equals(t) && (e.wv = ki(), (!(k != null && k.is_fork) || e.deps === null) && (k !== null ? (k.capture(e, t, !0), We == null || We.capture(e, t, !0)) : e.v = t, e.deps === null))) {
    H(e, ce);
    return;
  }
  je || (B !== null ? (rn() || k != null && k.is_fork) && B.set(e, t) : Kr(e));
}
function Ms(e) {
  if (e.effects !== null) {
    for (const r of e.effects) if (r.teardown || r.ac) {
      var t;
      (t = r.teardown) === null || t === void 0 || t.call(r), r.ac !== null && Dt(() => {
        r.ac.abort(Wt), r.ac = null;
      }), r.fn !== null && (r.teardown = Ui), Nt(r, 0), nn(r);
    }
  }
}
function Kn(e) {
  if (e.effects !== null)
    for (const t of e.effects) t.teardown && t.fn !== null && it(t);
}
function Gn(e, t) {
  if (t.has(e)) throw new TypeError("Cannot initialize the same private elements twice on an object");
}
function Zr(e, t) {
  Gn(e, t), t.add(e);
}
function O(e, t, r) {
  Gn(e, t), t.set(e, r);
}
function $(e, t, r) {
  if (typeof e == "function" ? e === t : e.has(t)) return arguments.length < 3 ? t : r;
  throw new TypeError("Private element is not present on this object");
}
function o(e, t) {
  return e.get($(e, t));
}
function E(e, t, r) {
  return e.set($(e, t), r), r;
}
var Xn, rr = null, ot = null, k = null, We = null, B = null, jr = null, At = !1, mr = !1, It = null, nr = null, Zn = 0;
var Ts = 1, ir = /* @__PURE__ */ new WeakMap(), Bt = /* @__PURE__ */ new WeakMap(), ft = /* @__PURE__ */ new WeakMap(), Ye = /* @__PURE__ */ new WeakMap(), kt = /* @__PURE__ */ new WeakMap(), tt = /* @__PURE__ */ new WeakMap(), Cr = /* @__PURE__ */ new WeakMap(), Fe = /* @__PURE__ */ new WeakMap(), ze = /* @__PURE__ */ new WeakMap(), Xt = /* @__PURE__ */ new WeakMap(), Et = /* @__PURE__ */ new WeakMap(), L = /* @__PURE__ */ new WeakSet(), at = class Jn {
  constructor() {
    Zr(this, L), P(this, "id", Ts++), P(this, "started", !1), P(this, "linked", !0), P(this, "prev", null), P(this, "next", null), P(this, "async_deriveds", /* @__PURE__ */ new Map()), P(this, "current", /* @__PURE__ */ new Map()), P(this, "previous", /* @__PURE__ */ new Map()), O(this, ir, /* @__PURE__ */ new Set()), O(this, Bt, /* @__PURE__ */ new Set()), O(this, ft, 0), O(this, Ye, /* @__PURE__ */ new Map()), O(this, kt, null), O(this, tt, []), O(this, Cr, []), O(this, Fe, /* @__PURE__ */ new Map()), O(this, ze, /* @__PURE__ */ new Map()), O(this, Xt, /* @__PURE__ */ new Set()), P(this, "is_fork", !1), O(this, Et, !1), ot === null ? rr = ot = this : (ot.next = this, this.prev = ot), ot = this;
  }
  skip_effect(t) {
    o(ze, this).has(t) || o(ze, this).set(t, {
      d: [],
      m: []
    }), o(Xt, this).delete(t);
  }
  unskip_effect(t, r = (n) => this.schedule(n)) {
    var n = o(ze, this).get(t);
    if (n) {
      o(ze, this).delete(t);
      for (var i of n.d)
        H(i, ie), r(i);
      for (i of n.m)
        H(i, Ce), r(i);
    }
    o(Xt, this).add(t);
  }
  capture(t, r, n = !1) {
    t.v !== V && !this.previous.has(t) && this.previous.set(t, t.v), (t.f & 8388608) === 0 && (this.current.set(t, [r, n]), B == null || B.set(t, r)), this.is_fork || (t.v = r);
  }
  activate() {
    k = this;
  }
  deactivate() {
    k = null, B = null;
  }
  flush() {
    try {
      mr = !0, k = this, $(L, this, sr).call(this);
    } finally {
      Zn = 0, jr = null, It = null, nr = null, mr = !1, k = null, B = null, Se.clear();
    }
  }
  discard() {
    var t;
    for (const r of o(Bt, this)) r(this);
    o(Bt, this).clear();
    for (const r of this.async_deriveds.values()) r.reject(xt);
    $(L, this, ar).call(this), (t = o(kt, this)) === null || t === void 0 || t.resolve();
  }
  register_created_effect(t) {
    o(Cr, this).push(t);
  }
  increment(t, r) {
    if (E(ft, this, o(ft, this) + 1), t) {
      var n;
      let i = (n = o(Ye, this).get(r)) !== null && n !== void 0 ? n : 0;
      o(Ye, this).set(r, i + 1);
    }
  }
  decrement(t, r) {
    if (E(ft, this, o(ft, this) - 1), t) {
      var n;
      let i = (n = o(Ye, this).get(r)) !== null && n !== void 0 ? n : 0;
      i === 1 ? o(Ye, this).delete(r) : o(Ye, this).set(r, i - 1);
    }
    o(Et, this) || (E(Et, this, !0), Oe(() => {
      E(Et, this, !1), this.linked && this.flush();
    }));
  }
  transfer_reactions(t) {
    for (const [r, n] of t) this.add_dirty_reaction(r, n);
    t.clear();
  }
  add_dirty_reaction(t, r) {
    (r === 2048 || o(Fe, this).get(t) !== 2048) && o(Fe, this).set(t, r);
  }
  oncommit(t) {
    o(ir, this).add(t);
  }
  ondiscard(t) {
    o(Bt, this).add(t);
  }
  settled() {
    var t;
    return ((t = o(kt, this)) !== null && t !== void 0 ? t : E(kt, this, Cn())).promise;
  }
  static ensure() {
    if (k === null) {
      const t = k = new Jn();
      !mr && !At && Oe(() => {
        t.started || t.flush();
      });
    }
    return k;
  }
  apply() {
    if (!st || !this.is_fork && this.prev === null && this.next === null) {
      B = null;
      return;
    }
    B = /* @__PURE__ */ new Map();
    for (const [t, [r]] of this.current) B.set(t, r);
    for (let t = rr; t !== null; t = t.next)
      if (!(t === this || t.is_fork) && (t.id >= this.id || !$(L, t, ti).call(t, this)))
        for (const [r, n] of t.previous) B.has(r) || B.set(r, n);
  }
  schedule(t) {
    var r;
    if (jr = t, !((r = t.b) === null || r === void 0) && r.is_pending && (t.f & 16777228) !== 0 && (t.f & 32768) === 0) {
      t.b.defer_effect(t);
      return;
    }
    o(tt, this).push(t);
  }
};
Xn = at;
function dn() {
  if (this.is_fork) return !0;
  for (const e of o(Ye, this).keys()) if (!$(L, this, As).call(this, e)) return !0;
  return !1;
}
function As(e) {
  for (var t = e; t !== null; t = t.parent) if (o(ze, this).has(t)) return !0;
  return !1;
}
function Qn() {
  var e = [];
  for (const i of o(tt, this))
    if (!((i.f & 16384) !== 0 || (i.f & 6144) === 0)) {
      for (var t = i, r = !1; t.parent !== null; ) {
        t = t.parent;
        var n = t.f;
        if ((n & 96) !== 0) {
          if ((n & 1024) === 0) {
            r = !0;
            break;
          }
          t.f ^= ce;
        }
      }
      r || e.push(t);
    }
  return E(tt, this, []), e;
}
function sr() {
  var e;
  this.started = !0;
  for (const [l, f] of o(Fe, this))
    H(l, f), this.schedule(l);
  this.apply();
  for (var t = It = [], r = [], n = nr = []; o(tt, this).length > 0; ) {
    Zn++ > 1e3 && ($(L, this, ar).call(this), Ps());
    for (const l of $(L, this, Qn).call(this)) try {
      $(L, this, ei).call(this, l, t, r);
    } catch (f) {
      throw ii(l), $(L, this, dn).call(this) || this.discard(), f;
    }
  }
  if (k = null, n.length > 0) {
    var i = Xn.ensure();
    for (const l of n) i.schedule(l);
  }
  if (It = null, nr = null, $(L, this, dn).call(this)) {
    $(L, this, St).call(this, r), $(L, this, St).call(this, t);
    for (const [l, f] of o(ze, this)) ni(l, f);
    n.length > 0 && $(L, k, sr).call(k);
    return;
  }
  const s = $(L, this, Os).call(this);
  if (s) {
    $(L, this, St).call(this, r), $(L, this, St).call(this, t), $(L, s, js).call(s, this);
    return;
  }
  o(Fe, this).clear();
  for (const l of o(ir, this)) l(this);
  o(ir, this).clear(), We = this, vn(r), vn(t), We = null, (e = o(kt, this)) === null || e === void 0 || e.resolve();
  var a = k;
  o(ft, this) === 0 && (o(tt, this).length === 0 || a !== null) && ($(L, this, ar).call(this), st && ($(L, this, Cs).call(this), k = a)), a !== null && (Se.clear(), $(L, a, sr).call(a));
}
function ei(e, t, r) {
  e.f ^= ce;
  for (var n = e.first; n !== null; ) {
    var i = n.f, s = (i & 96) !== 0;
    if (!(s && (i & 1024) !== 0 || (i & 8192) !== 0 || o(ze, this).has(n)) && n.fn !== null) {
      s ? n.f ^= ce : (i & 4) !== 0 ? t.push(n) : st && (i & 16777224) !== 0 ? r.push(n) : wt(n) && ((i & 16) !== 0 && this.add_dirty_reaction(n, Ce), it(n));
      var a = n.first;
      if (a !== null) {
        n = a;
        continue;
      }
    }
    for (; n !== null; ) {
      var l = n.next;
      if (l !== null) {
        n = l;
        break;
      }
      n = n.parent;
    }
  }
}
function Os() {
  for (var e = this.prev; e !== null; e = e.prev) if (!e.is_fork && $(L, this, ti).call(this, e)) return e;
  return null;
}
function ti(e) {
  for (const [t, [, r]] of this.current)
    if (!r && e.current.has(t))
      return !0;
  return !1;
}
function js(e) {
  for (const [r, n] of e.current)
    !this.previous.has(r) && e.previous.has(r) && this.previous.set(r, e.previous.get(r)), this.current.set(r, n);
  for (const [r, n] of e.async_deriveds) {
    const i = this.async_deriveds.get(r);
    i && n.promise.then(i.resolve).catch(i.reject);
  }
  e.async_deriveds.clear(), this.transfer_reactions(o(Fe, e));
  const t = (r) => {
    var n = r.reactions;
    if (n !== null && !((r.f & 2) !== 0 && (r.f & 6144) === 0))
      for (const a of n) {
        var i = a.f;
        if ((i & 2) !== 0) t(a);
        else {
          var s = a;
          i & 4194320 && !this.async_deriveds.has(s) && (o(Fe, this).delete(s), H(s, ie), this.schedule(s));
        }
      }
  };
  for (const r of this.current.keys()) t(r);
  this.oncommit(() => e.discard()), $(L, e, ar).call(e), k = this, $(L, this, sr).call(this);
}
function St(e) {
  for (var t = 0; t < e.length; t += 1) Un(e[t], o(Fe, this));
}
function Cs() {
  for (let d = rr; d !== null; d = d.next) {
    var e = d.id < this.id, t = [];
    for (const [c, [v, h]] of this.current) {
      if (d.current.has(c)) {
        var r = d.current.get(c)[0];
        if (e && v !== r) d.current.set(c, [v, h]);
        else continue;
      }
      t.push(c);
    }
    if (e) for (const [c, v] of this.async_deriveds) {
      const h = d.async_deriveds.get(c);
      h && v.promise.then(h.resolve).catch(h.reject);
    }
    var n = [...d.current.keys()].filter((c) => !d.current.get(c)[1]);
    if (!(!d.started || n.length === 0)) {
      var i = n.filter((c) => !this.current.has(c));
      if (i.length === 0)
        e && d.discard();
      else if (t.length > 0) {
        if (e) for (const c of o(Xt, this)) d.unskip_effect(c, (v) => {
          (v.f & 4194320) !== 0 ? d.schedule(v) : $(L, d, St).call(d, [v]);
        });
        d.activate();
        var s = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Map();
        for (var l of t) ri(l, i, s, a);
        a = /* @__PURE__ */ new Map();
        var f = [...d.current].filter(([c, v]) => {
          const h = this.current.get(c);
          return h ? h[0] !== v[0] || h[1] !== v[1] : !0;
        }).map(([c]) => c);
        if (f.length > 0)
          for (const c of o(Cr, this)) (c.f & 155648) === 0 && Qr(c, f, a) && ((c.f & 4194320) !== 0 ? (H(c, ie), d.schedule(c)) : d.add_dirty_reaction(c, ie));
        if (o(tt, d).length > 0 && !o(Et, d)) {
          d.apply();
          for (var u of $(L, d, Qn).call(d)) $(L, d, ei).call(d, u, [], []);
        }
        d.deactivate();
      }
    }
  }
}
function ar() {
  if (this.linked) {
    var e = this.prev, t = this.next;
    e === null ? rr = t : e.next = t, t === null ? ot = e : t.prev = e, this.linked = !1;
  }
}
function Jr(e) {
  var t = At, r = We;
  We = null, At = !0;
  try {
    var n;
    for (e && (Jr(), n = e()); ; ) {
      if (ws(), k === null) return n;
      k.flush();
    }
  } finally {
    At = t, We = r;
  }
}
function Ps() {
  if (0) {
    var e;
    for (const n of k.current.keys()) {
      var t;
      for (const [i, s] of (t = n.updated) !== null && t !== void 0 ? t : [])
        var r;
    }
  }
  try {
    cs();
  } catch (n) {
    Me(n, jr);
  }
}
var le = null;
function vn(e) {
  var t = e.length;
  if (t !== 0) {
    for (var r = 0; r < t; ) {
      var n = e[r++];
      if ((n.f & 24576) === 0 && wt(n) && (le = /* @__PURE__ */ new Set(), it(n), n.deps === null && n.first === null && n.nodes === null && n.teardown === null && n.ac === null && mi(n), (le == null ? void 0 : le.size) > 0)) {
        Se.clear();
        for (const i of le) {
          if ((i.f & 24576) !== 0) continue;
          const s = [i];
          let a = i.parent;
          for (; a !== null; )
            le.has(a) && (le.delete(a), s.push(a)), a = a.parent;
          for (let l = s.length - 1; l >= 0; l--) {
            const f = s[l];
            (f.f & 24576) === 0 && it(f);
          }
        }
        le.clear();
      }
    }
    le = null;
  }
}
function ri(e, t, r, n) {
  if (!r.has(e) && (r.add(e), e.reactions !== null))
    for (const i of e.reactions) {
      const s = i.f;
      (s & 2) !== 0 ? ri(i, t, r, n) : (s & 4194320) !== 0 && (s & 2048) === 0 && Qr(i, t, n) && (H(i, ie), en(i));
    }
}
function Qr(e, t, r) {
  const n = r.get(e);
  if (n !== void 0) return n;
  if (e.deps !== null) for (const i of e.deps) {
    if (Ct.call(t, i)) return !0;
    if ((i.f & 2) !== 0 && Qr(i, t, r))
      return r.set(i, !0), !0;
  }
  return r.set(e, !1), !1;
}
function en(e) {
  k.schedule(e);
}
function ni(e, t) {
  if (!((e.f & 32) !== 0 && (e.f & 1024) !== 0)) {
    (e.f & 2048) !== 0 ? t.d.push(e) : (e.f & 4096) !== 0 && t.m.push(e), H(e, ce);
    for (var r = e.first; r !== null; )
      ni(r, t), r = r.next;
  }
}
function ii(e) {
  H(e, ce);
  for (var t = e.first; t !== null; )
    ii(t), t = t.next;
}
var lr = /* @__PURE__ */ new Set(), Se = /* @__PURE__ */ new Map();
var si = !1;
function rt(e, t) {
  var r = {
    f: 0,
    v: e,
    reactions: null,
    equals: Wn,
    rv: 0,
    wv: 0
  };
  return r;
}
// @__NO_SIDE_EFFECTS__
function Ie(e, t) {
  const r = rt(e, t);
  return Zs(r), r;
}
// @__NO_SIDE_EFFECTS__
function Ot(e, t = !1, r = !0) {
  const n = rt(e);
  if (t || (n.equals = Fn), _t && r && W !== null && W.l !== null) {
    var i, s;
    ((s = (i = W.l).s) !== null && s !== void 0 ? s : i.s = []).push(n);
  }
  return n;
}
function K(e, t, r = !1) {
  T !== null && (!pe || (T.f & 131072) !== 0) && Ft() && (T.f & 4325394) !== 0 && (ge === null || !ge.has(e)) && _s();
  let n = r ? dt(t) : t;
  return pt(e, n, nr);
}
var Ve = null, Pr = 0;
function pt(e, t, r = null) {
  if (!e.equals(t)) {
    je ? Se.set(e, t) : Se.has(e) || Se.set(e, e.v);
    var n = at.ensure();
    if (n.capture(e, t), 0 && (tracing_mode_flag || S !== null))
      var i, s, a;
    if ((e.f & 2) !== 0) {
      const l = e;
      (e.f & 2048) !== 0 && Xr(l), B === null && Kr(l);
    }
    e.wv = ki(), Ve = null, Pr = 0, ai(e, ie, r), Ve = null, Ft() && S !== null && (S.f & 1024) !== 0 && (S.f & 96) === 0 && (oe === null ? Js([e]) : oe.push(e)), !n.is_fork && lr.size > 0 && !si && Rs();
  }
  return t;
}
function Rs() {
  si = !1;
  for (const e of lr) {
    (e.f & 1024) !== 0 && H(e, Ce);
    let t;
    try {
      t = wt(e);
    } catch (r) {
      t = !0;
    }
    t && it(e);
  }
  lr.clear();
}
function jt(e) {
  K(e, e.v + 1);
}
function ai(e, t, r) {
  var n = e.reactions;
  if (n !== null) {
    var i = Ft(), s = n.length;
    if (Pr += s, Pr > 1e5 && Ve === null && (Ve = /* @__PURE__ */ new Set()), Ve !== null) {
      if (Ve.has(e)) return;
      Ve.add(e);
    }
    for (var a = 0; a < s; a++) {
      var l = n[a], f = l.f;
      if (!(!i && l === S)) {
        var u = (f & ie) === 0;
        if (u && H(l, t), (f & 131072) !== 0) lr.add(l);
        else if ((f & 2) !== 0) {
          var d = l;
          B == null || B.delete(d), ai(d, Ce, r);
        } else if (u) {
          var c = l;
          (f & 16) !== 0 && le !== null && le.add(c), r !== null ? r.push(c) : en(c);
        }
      }
    }
  }
}
var Ls = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;
function dt(e) {
  if (typeof e != "object" || e === null || vt in e || In in e) return e;
  const t = qr(e);
  if (t !== Bi && t !== qi) return e;
  var r = /* @__PURE__ */ new Map(), n = On(e), i = /* @__PURE__ */ Ie(0), s = null, a = Je, l = (c) => {
    if (Je === a) return c();
    var v = T, h = Je;
    de(null), mn(a);
    var g = c();
    return de(v), mn(h), g;
  };
  n && r.set("length", /* @__PURE__ */ Ie(e.length, s));
  var f = "";
  let u = !1;
  function d(c) {
    if (!u) {
      u = !0, f = c, un(i, `${f} version`);
      for (const [v, h] of r) un(h, Is(f, v));
      u = !1;
    }
  }
  return new Proxy(e, {
    defineProperty(c, v, h) {
      (!("value" in h) || h.configurable === !1 || h.enumerable === !1 || h.writable === !1) && hs();
      var g = r.get(v);
      return g === void 0 ? l(() => {
        var _ = /* @__PURE__ */ Ie(h.value, s);
        return r.set(v, _), _;
      }) : K(g, h.value, !0), !0;
    },
    deleteProperty(c, v) {
      var h = r.get(v);
      if (h === void 0) {
        if (v in c) {
          const g = l(() => /* @__PURE__ */ Ie(V, s));
          r.set(v, g), jt(i);
        }
      } else
        K(h, V), jt(i);
      return !0;
    },
    get(c, v, h) {
      var g;
      if (v === vt) return e;
      var _ = r.get(v), p = v in c;
      if (_ === void 0 && (!p || !((g = Ze(c, v)) === null || g === void 0) && g.writable) && (_ = l(() => {
        var j = dt(p ? c[v] : V), R = /* @__PURE__ */ Ie(j, s);
        return R;
      }), r.set(v, _)), _ !== void 0) {
        var m = x(_);
        return m === V ? void 0 : m;
      }
      return Reflect.get(c, v, h);
    },
    getOwnPropertyDescriptor(c, v) {
      var h;
      (h = this.has) === null || h === void 0 || h.call(this, c, v);
      var g = Reflect.getOwnPropertyDescriptor(c, v), _ = r.get(v);
      if (_ !== void 0) {
        var p = x(_);
        if (p === V) return;
        if (g && "value" in g) g.value = p;
        else return {
          enumerable: !0,
          configurable: !0,
          value: p,
          writable: !0
        };
      }
      return g;
    },
    has(c, v) {
      var h;
      if (v === vt) return !0;
      var g = r.get(v), _ = g !== void 0 && g.v !== V || Reflect.has(c, v);
      return (g !== void 0 || (S !== null || T !== null) && (!_ || !((h = Ze(c, v)) === null || h === void 0) && h.writable)) && (g === void 0 && (g = l(() => {
        var p = _ ? dt(c[v]) : V, m = /* @__PURE__ */ Ie(p, s);
        return m;
      }), r.set(v, g)), x(g) === V) ? !1 : _;
    },
    set(c, v, h, g) {
      var _ = r.get(v), p = v in c;
      if (n && v === "length") for (var m = h; m < _.v; m += 1) {
        var j = r.get(m + "");
        j !== void 0 ? K(j, V) : m in c && (j = l(() => /* @__PURE__ */ Ie(V, s)), r.set(m + "", j));
      }
      if (_ === void 0) {
        var R;
        (!p || !((R = Ze(c, v)) === null || R === void 0) && R.writable) && (_ = l(() => /* @__PURE__ */ Ie(void 0, s)), K(_, dt(h)), r.set(v, _));
      } else {
        p = _.v !== V;
        var z = l(() => dt(h));
        K(_, z);
      }
      var G = Reflect.getOwnPropertyDescriptor(c, v);
      if (G != null && G.set && G.set.call(g, h), !p) {
        if (n && typeof v == "string") {
          var A = r.get("length"), q = Number(v);
          Number.isInteger(q) && q >= A.v && K(A, q + 1);
        }
        jt(i);
      }
      return !0;
    },
    ownKeys(c) {
      x(i);
      var v = Reflect.ownKeys(c).filter((_) => {
        var p = r.get(_);
        return p === void 0 || p.v !== V;
      });
      for (var [h, g] of r) g.v !== V && !(h in c) && v.push(h);
      return v;
    },
    setPrototypeOf() {
      ps();
    }
  });
}
function Is(e, t) {
  var r;
  return typeof t == "symbol" ? `${e}[Symbol(${(r = t.description) !== null && r !== void 0 ? r : ""})]` : Ls.test(t) ? `${e}.${t}` : /^\d+$/.test(t) ? `${e}[${t}]` : `${e}['${t}']`;
}
var hn, Ns, li, oi, fi;
function Rr() {
  if (hn === void 0) {
    hn = window, Ns = document, li = /Firefox/.test(navigator.userAgent);
    var e = Element.prototype, t = Node.prototype, r = Text.prototype;
    oi = Ze(t, "firstChild").get, fi = Ze(t, "nextSibling").get, on(e) && (e[Tr] = void 0, e[Mr] = null, e[Ji] = void 0, e.__e = void 0), on(r) && (r[Gt] = void 0);
  }
}
function De(e = "") {
  return document.createTextNode(e);
}
// @__NO_SIDE_EFFECTS__
function nt(e) {
  return oi.call(e);
}
// @__NO_SIDE_EFFECTS__
function Pe(e) {
  return fi.call(e);
}
function ui(e, t) {
  if (!N) return /* @__PURE__ */ nt(e);
  var r = /* @__PURE__ */ nt(F);
  if (r === null) r = F.appendChild(De());
  else if (t && r.nodeType !== 3) {
    var n = De();
    return r == null || r.before(n), fe(n), n;
  }
  return t && di(r), fe(r), r;
}
function pn(e, t = !1) {
  if (!N) return /* @__PURE__ */ nt(e);
  var r = ui(e, t);
  return Ar(e), r;
}
function _n(e, t = 1, r = !1) {
  let n = N ? F : e;
  for (var i; t--; )
    i = n, n = /* @__PURE__ */ Pe(n);
  if (!N) return n;
  if (r) {
    if ((n == null ? void 0 : n.nodeType) !== 3) {
      var s = De();
      return n === null ? i == null || i.after(s) : n.before(s), fe(s), s;
    }
    di(n);
  }
  return fe(n), n;
}
function ci(e) {
  e.textContent = "";
}
function zs() {
  return !st || le !== null ? !1 : (S.f & Yr) !== 0;
}
function tn(e, t, r) {
  return t == null || t === "http://www.w3.org/1999/xhtml" ? r ? document.createElement(e, { is: r }) : document.createElement(e) : r ? document.createElementNS(t, e, { is: r }) : document.createElementNS(t, e);
}
function di(e) {
  if (e.nodeValue.length < 65536) return;
  let t = e.nextSibling;
  for (; t !== null && t.nodeType === 3; )
    t.remove(), e.nodeValue += t.nodeValue, t = e.nextSibling;
}
function Ws(e) {
  var t = S;
  if (t === null)
    return T.f |= er, e;
  if ((t.f & 32768) === 0 && (t.f & 4) === 0)
    throw e;
  Me(e, t);
}
function Me(e, t) {
  if (e === Be) throw e;
  if (!(t !== null && (t.f & 16384) !== 0)) {
    for (; t !== null; ) {
      if ((t.f & 128) !== 0 && (t.f & 33570816) === 0) {
        if ((t.f & 32768) === 0) throw e;
        try {
          t.b.error(e);
          return;
        } catch (r) {
          e = r;
        }
      }
      t = t.parent;
    }
    throw e;
  }
}
function vi(e) {
  S === null && (T === null && us(e), fs()), je && os(e);
}
function Fs(e, t) {
  var r = t.last;
  r === null ? t.last = t.first = e : (r.next = e, e.prev = r, t.last = e);
}
function ye(e, t) {
  var r = S;
  r !== null && (r.f & 8192) !== 0 && (e |= Ur);
  var n = {
    ctx: W,
    deps: null,
    nodes: null,
    f: e | ie | 512,
    first: null,
    fn: t,
    last: null,
    next: null,
    parent: r,
    b: r && r.b,
    prev: null,
    teardown: null,
    wv: 0,
    ac: null
  };
  k == null || k.register_created_effect(n);
  var i = n;
  if ((e & 4) !== 0)
    It !== null ? It.push(n) : at.ensure().schedule(n);
  else if (t !== null) {
    try {
      it(n);
    } catch (l) {
      throw ue(n), l;
    }
    i.deps === null && i.teardown === null && i.nodes === null && i.first === i.last && (i.f & 524288) === 0 && (i = i.first, (e & 16) !== 0 && (e & 65536) !== 0 && i !== null && (i.f |= Rn));
  }
  if (i !== null && (i.parent = r, r !== null && Fs(i, r), T !== null && (T.f & 2) !== 0 && (e & 64) === 0)) {
    var s, a = T;
    ((s = a.effects) !== null && s !== void 0 ? s : a.effects = []).push(i);
  }
  return n;
}
function rn() {
  return T !== null && !pe;
}
function hi(e) {
  const t = ye(8, null);
  return H(t, ce), t.teardown = e, t;
}
function Lr(e) {
  vi("$effect");
  var t = S.f;
  if (!T && (t & 32) !== 0 && W !== null && !W.i) {
    var r, n = W;
    ((r = n.e) !== null && r !== void 0 ? r : n.e = []).push(e);
  } else return pi(e);
}
function pi(e) {
  return ye(4 | Ln, e);
}
function Ds(e) {
  return vi("$effect.pre"), ye(8 | Ln, e);
}
function Hs(e) {
  at.ensure();
  const t = ye(64 | gt, e);
  return () => {
    ue(t);
  };
}
function Bs(e) {
  at.ensure();
  const t = ye(64 | gt, e);
  return (r = {}) => new Promise((n) => {
    r.outro ? mt(t, () => {
      ue(t), n(void 0);
    }) : (ue(t), n(void 0));
  });
}
function qs(e) {
  return ye(4, e);
}
function Us(e, t) {
  var r = W, n = {
    effect: null,
    ran: !1,
    deps: e
  };
  r.l.$.push(n), n.effect = dr(() => {
    if (e(), !n.ran) {
      n.ran = !0;
      var i = S;
      try {
        ve(i.parent), ke(t);
      } finally {
        ve(i);
      }
    }
  });
}
function Ys() {
  var e = W;
  dr(() => {
    for (var t of e.l.$) {
      t.deps();
      var r = t.effect;
      (r.f & 1024) !== 0 && r.deps !== null && H(r, Ce), wt(r) && it(r), t.ran = !1;
    }
  });
}
function Vs(e) {
  return ye(Gi | gt, e);
}
function dr(e, t = 0) {
  return ye(8 | t, e);
}
function Ks(e, t = [], r = [], n = []) {
  $s(n, t, r, (i) => {
    ye(8, () => {
      e(...i.map(x));
    });
  });
}
function _i(e, t = 0) {
  var r = ye(16 | t, e);
  return r;
}
function Te(e) {
  return ye(32 | gt, e);
}
function gi(e) {
  var t = e.teardown;
  if (t !== null) {
    const r = je, n = T;
    gn(!0), de(null);
    try {
      t.call(null);
    } catch (i) {
      Me(i, e.parent);
    } finally {
      gn(r), de(n);
    }
  }
}
function nn(e, t = !1) {
  var r = e.first;
  for (e.first = e.last = null; r !== null; ) {
    const i = r.ac;
    i !== null && Dt(() => {
      i.abort(Wt);
    });
    var n = r.next;
    (r.f & 64) !== 0 ? r.parent = null : ue(r, t), r = n;
  }
}
function Gs(e) {
  for (var t = e.first; t !== null; ) {
    var r = t.next;
    (t.f & 32) === 0 && ue(t), t = r;
  }
}
function ue(e, t = !0) {
  var r = !1;
  (t || (e.f & 262144) !== 0) && e.nodes !== null && e.nodes.end !== null && (Xs(e.nodes.start, e.nodes.end), r = !0), e.f |= Sr, nn(e, t && !r), Nt(e, 0);
  var n = e.nodes && e.nodes.t;
  if (n !== null) for (const s of n) s.stop();
  gi(e), e.f ^= Sr, e.f |= Pn;
  var i = e.parent;
  i !== null && i.first !== null && mi(e), e.next = e.prev = e.teardown = e.ctx = e.deps = e.fn = e.nodes = e.ac = e.b = null;
}
function Xs(e, t) {
  for (; e !== null; ) {
    var r = e === t ? null : /* @__PURE__ */ Pe(e);
    e.remove(), e = r;
  }
}
function mi(e) {
  var t = e.parent, r = e.prev, n = e.next;
  r !== null && (r.next = n), n !== null && (n.prev = r), t !== null && (t.first === e && (t.first = n), t.last === e && (t.last = r));
}
function mt(e, t, r = !0) {
  var n = [];
  e.f |= 256, wi(e, n, !0);
  var i = () => {
    r && ue(e), t && t();
  }, s = n.length;
  if (s > 0) {
    var a = () => --s || i();
    for (var l of n) l.out(a);
  } else i();
}
function wi(e, t, r) {
  if ((e.f & 8192) === 0) {
    e.f ^= Ur;
    var n = e.nodes && e.nodes.t;
    if (n !== null)
      for (const l of n) (l.is_global || r) && t.push(l);
    for (var i = e.first; i !== null; ) {
      var s = i.next;
      if ((i.f & 64) === 0) {
        var a = (i.f & 65536) !== 0 || (i.f & 32) !== 0 && (e.f & 16) !== 0;
        wi(i, t, a ? r : !1);
      }
      i = s;
    }
  }
}
function yi(e) {
  e.f &= -257, bi(e, !0);
}
function bi(e, t) {
  if ((e.f & 256) === 0 && (e.f & 8192) !== 0) {
    e.f ^= Ur, (e.f & 1024) === 0 && (H(e, ie), at.ensure().schedule(e));
    for (var r = e.first; r !== null; ) {
      var n = r.next, i = (r.f & 65536) !== 0 || (r.f & 32) !== 0;
      bi(r, i ? t : !1), r = n;
    }
    var s = e.nodes && e.nodes.t;
    if (s !== null)
      for (const a of s) (a.is_global || t) && a.in();
  }
}
function $i(e, t) {
  if (e.nodes)
    for (var r = e.nodes.start, n = e.nodes.end; r !== null; ) {
      var i = r === n ? null : /* @__PURE__ */ Pe(r);
      t.append(r), r = i;
    }
}
var wr = null, je = !1;
function gn(e) {
  je = e;
}
var T = null, pe = !1;
function de(e) {
  T = e;
}
var S = null;
function ve(e) {
  S = e;
}
var ge = null;
function Zs(e) {
  if (T !== null && (!st && (T.f & 2097152) !== 0 || (T.f & 2) !== 0)) {
    var t;
    ((t = ge) !== null && t !== void 0 ? t : ge = /* @__PURE__ */ new Set()).add(e);
  }
}
var re = null, se = 0, oe = null;
function Js(e) {
  oe = e;
}
var xi = 1, Xe = 0, Je = Xe;
function mn(e) {
  Je = e;
}
function ki() {
  return ++xi;
}
function wt(e) {
  var t = e.f;
  if ((t & 2048) !== 0) return !0;
  if ((t & 4096) !== 0) {
    for (var r = e.deps, n = r.length, i = 0; i < n; i++) {
      var s = r[i];
      if (wt(s) && Vn(s), s.wv > e.wv) return !0;
    }
    (t & 512) !== 0 && B === null && H(e, ce);
  }
  return !1;
}
function Ei(e, t, r = !0) {
  var n = e.reactions;
  if (n !== null && !(!st && ge !== null && ge.has(e)))
    for (var i = 0; i < n.length; i++) {
      var s = n[i];
      (s.f & 2) !== 0 ? Ei(s, t, !1) : t === s && (r ? H(s, ie) : (s.f & 1024) !== 0 && H(s, Ce), en(s));
    }
}
function Si(e) {
  var t = re, r = se, n = oe, i = T, s = ge, a = W, l = pe, f = Je, u = e.f;
  re = null, se = 0, oe = null, T = (u & 96) === 0 ? e : null, ge = null, ht(e.ctx), pe = !1, Je = ++Xe, e.ac !== null && (Dt(() => {
    e.ac.abort(Wt);
  }), e.ac = null);
  try {
    e.f |= fn;
    var d = e.fn, c = d();
    e.f |= Yr;
    var v = wn(e);
    if (Ft() && oe !== null && !pe && v !== null && (e.f & 6146) === 0) for (var h = 0; h < oe.length; h++) Ei(oe[h], e);
    if (i !== null && i !== e) {
      if (Xe++, i.deps !== null) for (let g = 0; g < r; g += 1) i.deps[g].rv = Xe;
      if (t !== null) for (const g of t) g.rv = Xe;
      oe !== null && (n === null ? n = oe : n.push(...oe));
    }
    return (e.f & 8388608) !== 0 && (e.f ^= er), c;
  } catch (g) {
    return wn(e), Ws(g);
  } finally {
    e.f ^= fn, re = t, se = r, oe = n, T = i, ge = s, ht(a), pe = l, Je = f;
  }
}
function wn(e) {
  var t = e.deps, r = k == null ? void 0 : k.is_fork;
  if (re !== null) {
    var n;
    if (r || Nt(e, se), t !== null && se > 0)
      for (t.length = se + re.length, n = 0; n < re.length; n++) t[se + n] = re[n];
    else e.deps = t = re;
    if (rn() && (e.f & 512) !== 0) for (n = se; n < t.length; n++) {
      var i, s;
      ((s = (i = t[n]).reactions) !== null && s !== void 0 ? s : i.reactions = []).push(e);
    }
  } else !r && t !== null && se < t.length && (Nt(e, se), t.length = se);
  return t;
}
function Qs(e, t) {
  let r = t.reactions;
  if (r !== null) {
    var n = Hi.call(r, e);
    if (n !== -1) {
      var i = r.length - 1;
      i === 0 ? r = t.reactions = null : (r[n] = r[i], r.pop());
    }
  }
  if (r === null && (t.f & 2) !== 0 && (re === null || !Ct.call(re, t))) {
    var s = t;
    (s.f & 512) !== 0 && (s.f ^= 512), s.v !== V && Kr(s), s.ac !== null && Dt(() => {
      s.ac.abort(Wt), s.ac = null, H(s, ie);
    }), Ms(s), Nt(s, 0);
  }
}
function Nt(e, t) {
  var r = e.deps;
  if (r !== null)
    for (var n = t; n < r.length; n++) Qs(e, r[n]);
}
function it(e) {
  var t = e.f;
  if ((t & 16384) === 0) {
    H(e, ce);
    var r = S;
    if (S = e, 0)
      var n, i, s;
    try {
      (t & 16777232) !== 0 ? Gs(e) : nn(e), gi(e);
      var a = Si(e);
      if (e.teardown = typeof a == "function" ? a : null, e.wv = xi, 0)
        for (var l of e.deps) ;
    } finally {
      S = r;
    }
  }
}
function x(e) {
  var t = (e.f & 2) !== 0;
  if (wr == null || wr.add(e), T !== null && !pe && !(S !== null && (S.f & 16384) !== 0) && (ge === null || !ge.has(e))) {
    var r = T.deps;
    if ((T.f & 2097152) !== 0)
      e.rv < Xe && (e.rv = Xe, re === null && r !== null && r[se] === e ? se++ : re === null ? re = [e] : re.push(e));
    else {
      var n, i;
      (i = (n = T).deps) !== null && i !== void 0 || (n.deps = []), Ct.call(T.deps, e) || T.deps.push(e);
      var s = e.reactions;
      s === null ? e.reactions = [T] : Ct.call(s, T) || s.push(T);
    }
  }
  if (0) {
    if (!pe && reactivity_loss_tracker && k === null && We === null && !reactivity_loss_tracker.warned && (reactivity_loss_tracker.effect.f & 2097152) === 0 && !reactivity_loss_tracker.effect_deps.has(e))
      var a;
    if (tracing_mode_flag && !pe && tracing_expressions !== null && T !== null && tracing_expressions.reaction === T && !e.trace) {
      if (a)
        var l, f;
    }
  }
  if (je && Se.has(e)) return Se.get(e);
  if (t) {
    var u = e;
    if (je) {
      var d = u.v;
      return ((u.f & 1024) === 0 && u.reactions !== null || Ti(u)) && (d = Xr(u)), Se.set(u, d), d;
    }
    var c = (u.f & 512) === 0 && !pe && T !== null && (T.f & 512) !== 0, v = (u.f & Yr) === 0;
    wt(u) && (c && (u.f |= 512), Vn(u)), c && !v && (Kn(u), Mi(u));
  }
  if (B != null && B.has(e)) return B.get(e);
  if ((e.f & 8388608) !== 0) throw e.v;
  return e.v;
}
function Mi(e) {
  if (e.f |= 512, e.deps !== null)
    for (const r of e.deps) {
      var t = r.reactions;
      t === null ? r.reactions = [e] : Ct.call(t, e) || t.push(e), (r.f & 2) !== 0 && (r.f & 512) === 0 && (Kn(r), Mi(r));
    }
}
function Ti(e) {
  if (e.v === V) return !0;
  if (e.deps === null) return !1;
  for (const t of e.deps)
    if (Se.has(t) || (t.f & 2) !== 0 && Ti(t)) return !0;
  return !1;
}
function ke(e) {
  var t = pe;
  try {
    return pe = !0, e();
  } finally {
    pe = t;
  }
}
function Ai(e) {
  if (!(typeof e != "object" || !e || e instanceof EventTarget)) {
    if (vt in e) Ir(e);
    else if (!Array.isArray(e)) for (let t in e) {
      const r = e[t];
      typeof r == "object" && r && vt in r && Ir(r);
    }
  }
}
function Ir(e, t = /* @__PURE__ */ new Set()) {
  if (typeof e == "object" && e !== null && !(e instanceof EventTarget) && !t.has(e)) {
    t.add(e), e instanceof Date && e.getTime();
    for (let n in e) try {
      Ir(e[n], t);
    } catch (i) {
    }
    const r = qr(e);
    if (r !== Object.prototype && r !== Array.prototype && r !== Map.prototype && r !== Set.prototype && r !== Date.prototype) {
      const n = jn(r);
      for (let i in n) {
        const s = n[i].get;
        if (s) try {
          s.call(e);
        } catch (a) {
        }
      }
    }
  }
}
var qt = /* @__PURE__ */ Symbol("events"), ea = /* @__PURE__ */ new Set(), yn = /* @__PURE__ */ new Set();
function ta(e, t, r, n = {}) {
  function i(s) {
    if (n.capture || Nr.call(t, s), !s.cancelBubble) return Dt(() => r == null ? void 0 : r.call(this, s));
  }
  return e.startsWith("pointer") || e.startsWith("touch") || e === "wheel" ? (i.__removed = !1, Oe(() => {
    i.__removed || t.addEventListener(e, i, n);
  })) : t.addEventListener(e, i, n), i;
}
function ra(e, t, r, n, i) {
  var s = {
    capture: n,
    passive: i
  }, a = ta(e, t, r, s);
  (t === document.body || t === window || t === document || t instanceof HTMLMediaElement) && hi(() => {
    a.__removed = !0, t.removeEventListener(e, a, s);
  });
}
var yr = null, br = !1;
function Nr(e) {
  var t, r = this, n = r.ownerDocument, i = e.type, s = ((t = e.composedPath) === null || t === void 0 ? void 0 : t.call(e)) || [], a = s[0] || e.target;
  yr = e, br || (br = !0, setTimeout(() => {
    br = !1, yr = null;
  }));
  var l = 0, f = yr === e && e[qt];
  if (f) {
    var u = s.indexOf(f);
    if (u !== -1 && (r === document || r === window)) {
      e[qt] = r;
      return;
    }
    var d = s.indexOf(r);
    if (d === -1) return;
    u <= d && (l = u);
  }
  if (a = s[l] || e.target, a !== r) {
    Pt(e, "currentTarget", {
      configurable: !0,
      get() {
        return a || n;
      }
    });
    var c = T, v = S;
    de(null), ve(null);
    try {
      for (var h, g = []; a !== null && a !== r; ) {
        try {
          var _, p = (_ = a[qt]) === null || _ === void 0 ? void 0 : _[i];
          p != null && (!a.disabled || e.target === a) && p.call(a, e);
        } catch (m) {
          h ? g.push(m) : h = m;
        }
        if (e.cancelBubble) break;
        l++, a = l < s.length ? s[l] : null;
      }
      if (h) {
        for (let m of g) queueMicrotask(() => {
          throw m;
        });
        throw h;
      }
    } finally {
      e[qt] = r, delete e.currentTarget, de(c), ve(v);
    }
  }
}
var lt, $r = ((lt = globalThis) === null || lt === void 0 || (lt = lt.window) === null || lt === void 0 ? void 0 : lt.trustedTypes) && /* @__PURE__ */ globalThis.window.trustedTypes.createPolicy("svelte-trusted-html", { createHTML: (e) => e });
function na(e) {
  var t;
  return (t = $r == null ? void 0 : $r.createHTML(e)) !== null && t !== void 0 ? t : e;
}
function ia(e) {
  var t = tn("template");
  return t.innerHTML = na(e.replaceAll("<!>", "<!---->")), t.content;
}
function Zt(e, t) {
  var r = S;
  r.nodes === null && (r.nodes = {
    start: e,
    end: t,
    a: null,
    t: null
  });
}
// @__NO_SIDE_EFFECTS__
function Oi(e, t) {
  var r = (t & 1) !== 0, n = (t & 2) !== 0, i, s = !e.startsWith("<!>");
  return () => {
    if (N)
      return Zt(F, null), F;
    i === void 0 && (i = ia(s ? e : "<!>" + e), r || (i = /* @__PURE__ */ nt(i)));
    var a = n || li ? document.importNode(i, !0) : i.cloneNode(!0);
    if (r) {
      var l = /* @__PURE__ */ nt(a), f = a.lastChild;
      Zt(l, f);
    } else Zt(a, a);
    return a;
  };
}
function zr(e, t) {
  if (N) {
    var r = S;
    ((r.f & 32768) === 0 || r.nodes.end === null) && (r.nodes.end = F), Vr();
    return;
  }
  e !== null && e.before(t);
}
var sa = [
  "allowfullscreen",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "disabled",
  "formnovalidate",
  "indeterminate",
  "inert",
  "ismap",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "seamless",
  "selected",
  "webkitdirectory",
  "defer",
  "disablepictureinpicture",
  "disableremoteplayback"
], Za = [
  ...sa,
  "formNoValidate",
  "isMap",
  "noModule",
  "playsInline",
  "readOnly",
  "value",
  "volume",
  "defaultValue",
  "defaultChecked",
  "srcObject",
  "noValidate",
  "allowFullscreen",
  "disablePictureInPicture",
  "disableRemotePlayback"
], aa = ["touchstart", "touchmove"];
function la(e) {
  return aa.includes(e);
}
var oa = [
  "$state",
  "$state.raw",
  "$derived",
  "$derived.by"
], Ja = [
  ...oa,
  "$state.eager",
  "$state.snapshot",
  "$props",
  "$props.id",
  "$bindable",
  "$effect",
  "$effect.pre",
  "$effect.tracking",
  "$effect.root",
  "$effect.pending",
  "$inspect",
  "$inspect().with",
  "$inspect.trace",
  "$host"
];
function fa(e) {
  let t = 0, r = rt(0), n;
  return () => {
    rn() && (x(r), dr(() => (t === 0 && (n = ke(() => e(() => jt(r)))), t += 1, () => {
      Oe(() => {
        t -= 1, t === 0 && (n == null || n(), n = void 0, jt(r));
      });
    })));
  };
}
var ua = Rn | gt;
function ca(e, t, r, n) {
  new da(e, t, r, n);
}
var me = /* @__PURE__ */ new WeakMap(), Wr = /* @__PURE__ */ new WeakMap(), Ee = /* @__PURE__ */ new WeakMap(), zt = /* @__PURE__ */ new WeakMap(), ne = /* @__PURE__ */ new WeakMap(), we = /* @__PURE__ */ new WeakMap(), ae = /* @__PURE__ */ new WeakMap(), _e = /* @__PURE__ */ new WeakMap(), He = /* @__PURE__ */ new WeakMap(), ut = /* @__PURE__ */ new WeakMap(), Qe = /* @__PURE__ */ new WeakMap(), Ut = /* @__PURE__ */ new WeakMap(), Fr = /* @__PURE__ */ new WeakMap(), qe = /* @__PURE__ */ new WeakMap(), bn = /* @__PURE__ */ new WeakMap(), I = /* @__PURE__ */ new WeakSet(), da = class {
  constructor(e, t, r, n) {
    var i, s;
    Zr(this, I), P(this, "parent", void 0), P(this, "is_pending", !1), P(this, "transform_error", void 0), O(this, me, void 0), O(this, Wr, N ? F : null), O(this, Ee, void 0), O(this, zt, void 0), O(this, ne, void 0), O(this, we, null), O(this, ae, null), O(this, _e, null), O(this, He, null), O(this, ut, 0), O(this, Qe, 0), O(this, Ut, !1), O(this, Fr, /* @__PURE__ */ new Map()), O(this, qe, null), O(this, bn, fa(() => (E(qe, this, rt(o(ut, this))), () => {
      E(qe, this, null);
    }))), E(me, this, e), E(Ee, this, t), E(zt, this, (a) => {
      var l = S;
      l.b = this, l.f |= 128, r(a);
    }), this.parent = S.b, this.transform_error = (i = n != null ? n : (s = this.parent) === null || s === void 0 ? void 0 : s.transform_error) !== null && i !== void 0 ? i : ((a) => a), E(ne, this, _i(() => {
      if (N) {
        const a = zn(o(Wr, this));
        Vr();
        const l = a === "[!";
        if (a.startsWith("[?")) {
          const f = JSON.parse(a.slice(2));
          $(I, this, ha).call(this, f);
        } else l ? $(I, this, pa).call(this) : $(I, this, va).call(this);
      } else $(I, this, Ci).call(this);
    }, ua)), N && E(me, this, F);
  }
  defer_effect(e) {
    Un(e, o(Fr, this));
  }
  is_rendered() {
    return !this.is_pending && (!this.parent || this.parent.is_rendered());
  }
  has_pending_snippet() {
    return !!o(Ee, this).pending;
  }
  update_pending_count(e, t) {
    $(I, this, Pi).call(this, e, t), E(ut, this, o(ut, this) + e), !(!o(qe, this) || o(Ut, this)) && (E(Ut, this, !0), Oe(() => {
      E(Ut, this, !1), o(qe, this) && pt(o(qe, this), o(ut, this));
    }));
  }
  get_effect_pending() {
    return o(bn, this).call(this), x(o(qe, this));
  }
  error(e) {
    if (e === Be || !o(Ee, this).onerror && !o(Ee, this).failed) throw e;
    k != null && k.is_fork ? (o(we, this) && k.skip_effect(o(we, this)), o(ae, this) && k.skip_effect(o(ae, this)), o(_e, this) && k.skip_effect(o(_e, this)), k.oncommit(() => {
      $(I, this, et).call(this) || $(I, this, $n).call(this, e);
    })) : $(I, this, $n).call(this, e);
  }
};
function va() {
  try {
    E(we, this, Te(() => o(zt, this).call(this, o(me, this))));
  } catch (e) {
    this.error(e);
  }
}
function ha(e) {
  const t = o(Ee, this).failed, { reset: r, invoke_onerror: n } = $(I, this, ji).call(this, e);
  Oe(n), t && E(_e, this, Te(() => {
    t(o(me, this), () => e, () => r);
  }));
}
function ji(e) {
  var t = !1, r = !1;
  const n = () => {
    if (!$(I, this, et).call(this)) {
      if (t) {
        rs();
        return;
      }
      t = !0, r && gs(), o(_e, this) !== null && mt(o(_e, this), () => {
        E(_e, this, null);
      }), $(I, this, sn).call(this, () => {
        $(I, this, Ci).call(this);
      });
    }
  };
  return {
    reset: n,
    invoke_onerror: () => {
      if (!$(I, this, et).call(this))
        try {
          var s, a;
          r = !0, (s = (a = o(Ee, this)).onerror) === null || s === void 0 || s.call(a, e, n), r = !1;
        } catch (l) {
          Me(l, o(ne, this) && o(ne, this).parent);
        }
    }
  };
}
function et() {
  return (o(ne, this).f & (Pn | Sr)) !== 0;
}
function pa() {
  const e = o(Ee, this).pending;
  e && (this.is_pending = !0, E(ae, this, Te(() => e(o(me, this)))), Oe(() => {
    if (!$(I, this, et).call(this)) {
      var t = E(He, this, document.createDocumentFragment()), r = De(), n = !1;
      if (t.append(r), E(we, this, $(I, this, sn).call(this, () => {
        try {
          return Te(() => o(zt, this).call(this, r));
        } catch (i) {
          try {
            this.error(i), n = !0;
          } catch (s) {
            Me(s, o(ne, this).parent);
          }
          return null;
        }
      })), o(we, this) === null) {
        E(He, this, null), n && $(I, this, or).call(this, k);
        return;
      }
      o(Qe, this) === 0 && (o(me, this).before(t), E(He, this, null), mt(o(ae, this), () => {
        E(ae, this, null);
      }), $(I, this, or).call(this, k));
    }
  }));
}
function Ci() {
  try {
    if (this.is_pending = this.has_pending_snippet(), E(Qe, this, 0), E(ut, this, 0), E(we, this, Te(() => {
      o(zt, this).call(this, o(me, this));
    })), o(Qe, this) > 0) {
      var e = E(He, this, document.createDocumentFragment());
      $i(o(we, this), e);
      const t = o(Ee, this).pending;
      E(ae, this, Te(() => t(o(me, this))));
    } else $(I, this, or).call(this, k);
  } catch (t) {
    this.error(t);
  }
}
function or(e) {
  this.is_pending = !1, e.transfer_reactions(o(Fr, this));
}
function sn(e) {
  var t = S, r = T, n = W;
  ve(o(ne, this)), de(o(ne, this)), ht(o(ne, this).ctx);
  try {
    return at.ensure(), e();
  } finally {
    ve(t), de(r), ht(n);
  }
}
function Pi(e, t) {
  if (!this.has_pending_snippet()) {
    if (this.parent) {
      var r;
      $(I, r = this.parent, Pi).call(r, e, t);
    }
    return;
  }
  E(Qe, this, o(Qe, this) + e), o(Qe, this) === 0 && ($(I, this, or).call(this, t), o(ae, this) && mt(o(ae, this), () => {
    E(ae, this, null);
  }), o(He, this) && (o(me, this).before(o(He, this)), E(He, this, null)));
}
function $n(e) {
  o(we, this) && (ue(o(we, this)), E(we, this, null)), o(ae, this) && (ue(o(ae, this)), E(ae, this, null)), o(_e, this) && (ue(o(_e, this)), E(_e, this, null)), N && (fe(o(Wr, this)), ns(), fe(Or()));
  let t = o(Ee, this).failed;
  const r = (n) => {
    if ($(I, this, et).call(this)) return;
    const { reset: i, invoke_onerror: s } = $(I, this, ji).call(this, n);
    s(), t && !$(I, this, et).call(this) && E(_e, this, $(I, this, sn).call(this, () => {
      try {
        return Te(() => {
          var a = S;
          a.b = this, a.f |= 128, t(o(me, this), () => n, () => i);
        });
      } catch (a) {
        return Me(a, o(ne, this).parent), null;
      }
    }));
  };
  Oe(() => {
    if (!$(I, this, et).call(this)) {
      var n;
      try {
        n = this.transform_error(e);
      } catch (i) {
        Me(i, o(ne, this) && o(ne, this).parent);
        return;
      }
      n !== null && typeof n == "object" && typeof n.then == "function" ? n.then(r, (i) => Me(i, o(ne, this) && o(ne, this).parent)) : r(n);
    }
  });
}
var xn = !0;
function kn(e, t) {
  var r, n = t == null ? "" : typeof t == "object" ? `${t}` : t;
  n !== ((r = e[Gt]) !== null && r !== void 0 ? r : e[Gt] = e.nodeValue) && (e[Gt] = n, e.nodeValue = `${n}`);
}
function Ri(e, t) {
  return Li(e, t);
}
function _a(e, t) {
  var r;
  Rr(), t.intro = (r = t.intro) !== null && r !== void 0 ? r : !1;
  const n = t.target, i = N, s = F;
  try {
    for (var a = /* @__PURE__ */ nt(n); a && (a.nodeType !== 8 || a.data !== "["); ) a = /* @__PURE__ */ Pe(a);
    if (!a) throw Be;
    Ke(!0), fe(a);
    const l = Li(e, te(te({}, t), {}, { anchor: a }));
    return Ke(!1), l;
  } catch (l) {
    if (l instanceof Error && l.message.split(`
`).some((f) => f.startsWith("https://svelte.dev/e/"))) throw l;
    return l !== Be && console.warn("Failed to hydrate: ", l), t.recover === !1 && ds(), Rr(), ci(n), Ke(!1), Ri(e, t);
  } finally {
    Ke(i), fe(s);
  }
}
var Yt = /* @__PURE__ */ new Map();
function Li(e, { target: t, anchor: r, props: n = {}, events: i, context: s, intro: a = !0, transformError: l }) {
  Rr();
  var f = void 0, u = Bs(() => {
    var d = r != null ? r : t.appendChild(De());
    ca(d, { pending: () => {
    } }, (h) => {
      Dn({});
      var g = W;
      if (s && (g.c = s), i && (n.$$events = i), N && Zt(h, null), xn = a, f = e(h, n) || Bn(), xn = !0, N && (S.nodes.end = F, F === null || F.nodeType !== 8 || F.data !== "]"))
        throw cr(), Be;
      Hn();
    }, l);
    var c = /* @__PURE__ */ new Set(), v = (h) => {
      for (var g = 0; g < h.length; g++) {
        var _ = h[g];
        if (!c.has(_)) {
          c.add(_);
          var p = la(_);
          for (const R of [t, document]) {
            var m = Yt.get(R);
            m === void 0 && (m = /* @__PURE__ */ new Map(), Yt.set(R, m));
            var j = m.get(_);
            j === void 0 ? (R.addEventListener(_, Nr, { passive: p }), m.set(_, 1)) : m.set(_, j + 1);
          }
        }
      }
    };
    return v(ur(ea)), yn.add(v), () => {
      for (var h of c) for (const m of [t, document]) {
        var g = Yt.get(m), _ = g.get(h);
        --_ == 0 ? (m.removeEventListener(h, Nr), g.delete(h), g.size === 0 && Yt.delete(m)) : g.set(h, _);
      }
      if (yn.delete(v), d !== r) {
        var p;
        (p = d.parentNode) === null || p === void 0 || p.removeChild(d);
      }
    };
  });
  return Dr.set(f, u), f;
}
var Dr = /* @__PURE__ */ new WeakMap();
function ga(e, t) {
  const r = Dr.get(e);
  return r ? (Dr.delete(e), r(t)) : Promise.resolve();
}
function ma(e) {
  W === null && ss("onMount"), _t && W.l !== null ? wa(W).m.push(e) : Lr(() => {
    const t = ke(e);
    if (typeof t == "function") return t;
  });
}
function wa(e) {
  var t, r = e.l;
  return (t = r.u) !== null && t !== void 0 ? t : r.u = {
    a: [],
    b: [],
    m: []
  };
}
function ya(e, t) {
  return t;
}
function ba(e, t, r) {
  for (var n = [], i = t.length, s, a = t.length, l = 0; l < i; l++) {
    let v = t[l];
    mt(v, () => {
      if (s) {
        if (s.pending.delete(v), s.done.add(v), s.pending.size === 0) {
          var h = e.outrogroups;
          Hr(e, ur(s.done)), h.delete(s), h.size === 0 && (e.outrogroups = null);
        }
      } else a -= 1;
    }, !1);
  }
  if (a === 0) {
    var f = n.length === 0 && r !== null && e.pending.size === 0;
    if (f) {
      var u = r, d = u.parentNode;
      ci(d), d.append(u), e.items.clear();
    }
    Hr(e, t, !f);
  } else {
    var c;
    s = {
      pending: new Set(t),
      done: /* @__PURE__ */ new Set()
    }, ((c = e.outrogroups) !== null && c !== void 0 ? c : e.outrogroups = /* @__PURE__ */ new Set()).add(s);
  }
}
function Hr(e, t, r = !0) {
  var n;
  if (e.pending.size > 0) {
    n = /* @__PURE__ */ new Set();
    for (const a of e.pending.values()) for (const l of a) n.add(e.items.get(l).e);
  }
  for (var i = 0; i < t.length; i++) {
    var s = t[i];
    if (n != null && n.has(s)) {
      s.f |= Tt;
      const a = document.createDocumentFragment();
      $i(s, a);
    } else ue(t[i], r);
  }
}
var Vt;
function $a(e, t, r, n, i, s = null) {
  var a = e, l = /* @__PURE__ */ new Map();
  if ((t & 4) !== 0) {
    var f = e;
    a = N ? fe(/* @__PURE__ */ nt(f)) : f.appendChild(De());
  }
  N && Vr();
  var u = null, d = /* @__PURE__ */ Gr(() => {
    var p = r();
    return On(p) ? p : p == null ? [] : ur(p);
  }), c = /* @__PURE__ */ new Map(), v = !0;
  function h(p) {
    if ((_.effect.f & 16384) === 0) {
      _.pending.delete(p);
      var m = x(d);
      _.fallback = u, xa(_, m, a, t, n), u !== null && (m.length === 0 ? (u.f & 33554432) === 0 ? yi(u) : (u.f ^= Tt, Mt(u, null, a)) : mt(u, () => {
        u = null;
      }));
    }
  }
  function g(p) {
    _.pending.delete(p);
  }
  var _ = {
    effect: _i(() => {
      var p = x(d), m = p.length;
      let j = !1;
      N && zn(a) === "[!" != (m === 0) && (a = Or(), fe(a), Ke(!1), j = !0);
      for (var R = /* @__PURE__ */ new Set(), z = k, G = zs(), A = 0; A < m; A += 1) {
        N && F.nodeType === 8 && F.data === "]" && (a = F, j = !0, Ke(!1));
        var q = p[A], U = n(q, A);
        if (0)
          var yt;
        var X = v ? null : l.get(U);
        if (X)
          X.v && pt(X.v, q), X.i && pt(X.i, A), G && z.unskip_effect(X.e);
        else {
          var be;
          X = ka(l, v ? a : (be = Vt) !== null && be !== void 0 ? be : Vt = De(), q, U, A, i, t, r), v || (X.e.f |= Tt), l.set(U, X);
        }
        R.add(U);
      }
      if (m === 0 && s && !u && (v ? u = Te(() => s(a)) : (u = Te(() => {
        var he;
        return s((he = Vt) !== null && he !== void 0 ? he : Vt = De());
      }), u.f |= Tt)), m > R.size && ls("", "", ""), N && m > 0 && fe(Or()), !v)
        if (c.set(z, R), G) {
          for (const [he, $e] of l) R.has(he) || z.skip_effect($e.e);
          z.oncommit(h), z.ondiscard(g);
        } else h(z);
      j && Ke(!0), x(d);
    }),
    flags: t,
    items: l,
    pending: c,
    outrogroups: null,
    fallback: u
  };
  v = !1, N && (a = F);
}
function $t(e) {
  for (; e !== null && (e.f & 32) === 0; ) e = e.next;
  return e;
}
function xa(e, t, r, n, i) {
  var s = (n & 8) !== 0, a = t.length, l = e.items, f = $t(e.effect.first), u, d = null, c, v = [], h = [], g, _, p, m;
  if (s) {
    for (m = 0; m < a; m += 1)
      if (g = t[m], _ = i(g, m), p = l.get(_).e, (p.f & 33554432) === 0) {
        var j, R;
        (j = p.nodes) === null || j === void 0 || (j = j.a) === null || j === void 0 || j.measure(), ((R = c) !== null && R !== void 0 ? R : c = /* @__PURE__ */ new Set()).add(p);
      }
  }
  for (m = 0; m < a; m += 1) {
    if (g = t[m], _ = i(g, m), p = l.get(_).e, e.outrogroups !== null) for (const Z of e.outrogroups)
      Z.pending.delete(p), Z.done.delete(p);
    if ((p.f & 8192) !== 0 && (yi(p), s)) {
      var z, G;
      (z = p.nodes) === null || z === void 0 || (z = z.a) === null || z === void 0 || z.unfix(), ((G = c) !== null && G !== void 0 ? G : c = /* @__PURE__ */ new Set()).delete(p);
    }
    if ((p.f & 33554432) !== 0)
      if (p.f ^= Tt, p === f) Mt(p, null, r);
      else {
        var A = d ? d.next : f;
        p === e.effect.last && (e.effect.last = p.prev), p.prev && (p.prev.next = p.next), p.next && (p.next.prev = p.prev), Ne(e, d, p), Ne(e, p, A), Mt(p, A, r), d = p, v = [], h = [], f = $t(d.next);
        continue;
      }
    if (p !== f) {
      if (u !== void 0 && u.has(p)) {
        if (v.length < h.length) {
          var q = h[0], U;
          d = q.prev;
          var yt = v[0], X = v[v.length - 1];
          for (U = 0; U < v.length; U += 1) Mt(v[U], q, r);
          for (U = 0; U < h.length; U += 1) u.delete(h[U]);
          Ne(e, yt.prev, X.next), Ne(e, d, yt), Ne(e, X, q), f = q, d = X, m -= 1, v = [], h = [];
        } else
          u.delete(p), Mt(p, f, r), Ne(e, p.prev, p.next), Ne(e, p, d === null ? e.effect.first : d.next), Ne(e, d, p), d = p;
        continue;
      }
      for (v = [], h = []; f !== null && f !== p; ) {
        var be;
        ((be = u) !== null && be !== void 0 ? be : u = /* @__PURE__ */ new Set()).add(f), h.push(f), f = $t(f.next);
      }
      if (f === null) continue;
    }
    (p.f & 33554432) === 0 && v.push(p), d = p, f = $t(p.next);
  }
  if (e.outrogroups !== null) {
    for (const Z of e.outrogroups) if (Z.pending.size === 0) {
      var he;
      Hr(e, ur(Z.done)), (he = e.outrogroups) === null || he === void 0 || he.delete(Z);
    }
    e.outrogroups.size === 0 && (e.outrogroups = null);
  }
  if (f !== null || u !== void 0) {
    var $e = [];
    if (u !== void 0)
      for (p of u) (p.f & 8192) === 0 && $e.push(p);
    for (; f !== null; )
      (f.f & 8192) === 0 && f !== e.fallback && $e.push(f), f = $t(f.next);
    var bt = $e.length;
    if (bt > 0) {
      var vr = (n & 4) !== 0 && a === 0 ? r : null;
      if (s) {
        for (m = 0; m < bt; m += 1) {
          var Re;
          (Re = $e[m].nodes) === null || Re === void 0 || (Re = Re.a) === null || Re === void 0 || Re.measure();
        }
        for (m = 0; m < bt; m += 1) {
          var Le;
          (Le = $e[m].nodes) === null || Le === void 0 || (Le = Le.a) === null || Le === void 0 || Le.fix();
        }
      }
      ba(e, $e, vr);
    }
  }
  s && Oe(() => {
    if (c !== void 0)
      for (p of c) {
        var Z;
        (Z = p.nodes) === null || Z === void 0 || (Z = Z.a) === null || Z === void 0 || Z.apply();
      }
  });
}
function ka(e, t, r, n, i, s, a, l) {
  var f = (a & 1) !== 0 ? (a & 16) === 0 ? /* @__PURE__ */ Ot(r, !1, !1) : rt(r) : null, u = (a & 2) !== 0 ? rt(i) : null;
  return {
    v: f,
    i: u,
    e: Te(() => (s(t, f != null ? f : r, u != null ? u : i, l), () => {
      e.delete(n);
    }))
  };
}
function Mt(e, t, r) {
  if (e.nodes)
    for (var n = e.nodes.start, i = e.nodes.end, s = t && (t.f & 33554432) === 0 ? t.nodes.start : r; n !== null; ) {
      var a = /* @__PURE__ */ Pe(n);
      if (s.before(n), n === i) return;
      n = a;
    }
}
function Ne(e, t, r) {
  t === null ? e.effect.first = r : t.next = r, r === null ? e.effect.last = t : r.prev = t;
}
function Ea(e, t) {
  qs(() => {
    var r, n, i;
    e = (r = S == null || (n = S.parent) === null || n === void 0 || (n = n.nodes) === null || n === void 0 ? void 0 : n.start) !== null && r !== void 0 ? r : e;
    var s = e.getRootNode(), a = s.host ? s : (i = s.head) !== null && i !== void 0 ? i : s.ownerDocument.head;
    if (!a.querySelector("#" + t.hash)) {
      const l = tn("style");
      l.id = t.hash, l.textContent = t.code, a.appendChild(l);
    }
  });
}
var En = [...` 	
\r\f \v\uFEFF`];
function Sa(e, t, r) {
  var n = e == null ? "" : "" + e;
  if (t && (n = n ? n + " " + t : t), r) {
    for (var i of Object.keys(r)) if (r[i]) n = n ? n + " " + i : i;
    else if (n.length)
      for (var s = i.length, a = 0; (a = n.indexOf(i, a)) >= 0; ) {
        var l = a + s;
        (a === 0 || En.includes(n[a - 1])) && (l === n.length || En.includes(n[l])) ? n = (a === 0 ? "" : n.substring(0, a)) + n.substring(l + 1) : a = l;
      }
  }
  return n === "" ? null : n;
}
function Ma(e, t, r, n, i, s) {
  var a = e[Tr];
  if (N || a !== r || a === void 0) {
    var l = Sa(r, n, s);
    (!N || l !== e.getAttribute("class")) && (l == null ? e.removeAttribute("class") : t ? e.className = l : e.setAttribute("class", l)), e[Tr] = r;
  } else if (s && i !== s) for (var f in s) {
    var u = !!s[f];
    (i == null || u !== !!i[f]) && e.classList.toggle(f, u);
  }
  return s;
}
var Ta = /* @__PURE__ */ Symbol("is custom element"), Aa = /* @__PURE__ */ Symbol("is html"), Oa = Qi ? "link" : "LINK";
function xr(e, t, r, n) {
  var i = ja(e);
  if (N && (i[t] = e.getAttribute(t), t === "src" || t === "srcset" || t === "href" && e.nodeName === Oa)) {
    n || Pa(e, t, r != null ? r : "");
    return;
  }
  var s = i[t];
  s !== (i[t] = r) && (t === "loading" && (e[Xi] = r), r == null ? e.removeAttribute(t) : typeof r != "string" && Ca(e).has(t) ? e[t] = r : N && (typeof r == "number" || typeof r == "boolean") && s === String(r) || e.setAttribute(t, r));
}
function ja(e) {
  var t;
  return (t = e[Mr]) !== null && t !== void 0 ? t : e[Mr] = {
    [Ta]: e.nodeName.includes("-"),
    [Aa]: e.namespaceURI === Di
  };
}
var Sn = /* @__PURE__ */ new Map();
function Ca(e) {
  var t = e.getAttribute("is") || e.nodeName, r = Sn.get(t);
  if (r) return r;
  Sn.set(t, r = /* @__PURE__ */ new Set());
  for (var n, i = e, s = Element.prototype; s !== i; ) {
    n = jn(i);
    for (var a in n) n[a].set && a !== "innerHTML" && a !== "textContent" && a !== "innerText" && r.add(a);
    i = qr(i);
  }
  return r;
}
function Pa(e, t, r) {
  var n;
}
function Br(e, t) {
  return e === t ? !0 : new URL(e, document.baseURI).href === new URL(t, document.baseURI).href;
}
function Mn(e) {
  return e.split(",").map((t) => t.trim().split(" ").filter(Boolean));
}
function Ra(e, t) {
  var r = Mn(e.srcset), n = Mn(t);
  return n.length === r.length && n.every(([i, s], a) => s === r[a][1] && (Br(r[a][0], i) || Br(i, r[a][0])));
}
var Ii, ct = /* @__PURE__ */ new WeakMap(), fr = /* @__PURE__ */ new WeakMap(), kr = /* @__PURE__ */ new WeakMap(), Tn = /* @__PURE__ */ new WeakSet(), Ni = class {
  constructor(e) {
    Zr(this, Tn), O(this, ct, /* @__PURE__ */ new WeakMap()), O(this, fr, void 0), O(this, kr, void 0), E(kr, this, e);
  }
  observe(e, t) {
    var r = o(ct, this).get(e) || /* @__PURE__ */ new Set();
    return r.add(t), o(ct, this).set(e, r), $(Tn, this, La).call(this).observe(e, o(kr, this)), () => {
      var n = o(ct, this).get(e);
      n.delete(t), n.size === 0 && (o(ct, this).delete(e), o(fr, this).unobserve(e));
    };
  }
};
Ii = Ni;
function La() {
  var e;
  return (e = o(fr, this)) !== null && e !== void 0 ? e : E(fr, this, new ResizeObserver((t) => {
    for (var r of t) {
      Ii.entries.set(r.target, r);
      for (var n of o(ct, this).get(r.target) || []) n(r);
    }
  }));
}
P(Ni, "entries", /* @__PURE__ */ new WeakMap());
function Ia(e = !1) {
  const t = W, r = t.l.u;
  if (!r) return;
  let n = () => Ai(t.s);
  if (e) {
    let i = 0, s = {};
    const a = /* @__PURE__ */ Lt(() => {
      let l = !1;
      const f = t.s;
      for (const u in f) f[u] !== s[u] && (s[u] = f[u], l = !0);
      return l && i++, i;
    });
    n = () => x(a);
  }
  r.b.length && Ds(() => {
    An(t, n), Er(r.b);
  }), Lr(() => {
    const i = ke(() => r.m.map(Yi));
    return () => {
      for (const s of i) typeof s == "function" && s();
    };
  }), r.a.length && Lr(() => {
    An(t, n), Er(r.a);
  });
}
function An(e, t) {
  if (e.l.s) for (const r of e.l.s) x(r);
  t();
}
var Kt = !1;
function Na(e) {
  var t = Kt;
  try {
    return Kt = !1, [e(), Kt];
  } finally {
    Kt = t;
  }
}
function za(e, t, r, n) {
  var i = !_t || (r & 2) !== 0, s = (r & 8) !== 0, a = (r & 16) !== 0, l = n, f = !0, u = void 0, d = () => {
    if (a && i) {
      var A;
      return (A = u) !== null && A !== void 0 || (u = /* @__PURE__ */ Lt(n)), x(u);
    }
    return f && (f = !1, l = a ? ke(n) : n), l;
  };
  let c;
  if (s) {
    var v, h, g = vt in e || Nn in e;
    c = (v = (h = Ze(e, t)) === null || h === void 0 ? void 0 : h.set) !== null && v !== void 0 ? v : g && t in e ? (A) => e[t] = A : void 0;
  }
  var _, p = !1;
  s ? [_, p] = Na(() => e[t]) : _ = e[t], _ === void 0 && n !== void 0 && (_ = d(), c && (i && vs(t), c(_)));
  var m;
  if (i ? m = () => {
    var A = e[t];
    return A === void 0 ? d() : (f = !0, A);
  } : m = () => {
    var A = e[t];
    return A !== void 0 && (l = void 0), A === void 0 ? l : A;
  }, i && (r & 4) === 0) return m;
  if (c) {
    var j = e.$$legacy;
    return (function(A, q) {
      return arguments.length > 0 ? ((!i || !q || j || p) && c(q ? m() : A), A) : m();
    });
  }
  var R = !1, z = ((r & 1) !== 0 ? Lt : Gr)(() => (R = !1, m()));
  s && x(z);
  var G = S;
  return (function(A, q) {
    if (arguments.length > 0) {
      const U = q ? x(z) : i && s ? dt(A) : A;
      return K(z, U), R = !0, l !== void 0 && (l = U), A;
    }
    return je && R || (G.f & 16384) !== 0 ? z.v : x(z);
  });
}
function Wa(e) {
  return new Fa(e);
}
var Ue = /* @__PURE__ */ new WeakMap(), xe = /* @__PURE__ */ new WeakMap(), Fa = class {
  constructor(e) {
    var t, r;
    O(this, Ue, void 0), O(this, xe, void 0);
    var n = /* @__PURE__ */ new Map(), i = (a, l) => {
      var f = /* @__PURE__ */ Ot(l, !1, !1);
      return n.set(a, f), f;
    };
    const s = new Proxy(te(te({}, e.props || {}), {}, { $$events: {} }), {
      get(a, l) {
        var f;
        return x((f = n.get(l)) !== null && f !== void 0 ? f : i(l, Reflect.get(a, l)));
      },
      has(a, l) {
        var f;
        return l === Nn ? !0 : (x((f = n.get(l)) !== null && f !== void 0 ? f : i(l, Reflect.get(a, l))), Reflect.has(a, l));
      },
      set(a, l, f) {
        var u;
        return K((u = n.get(l)) !== null && u !== void 0 ? u : i(l, f), f), Reflect.set(a, l, f);
      }
    });
    E(xe, this, (e.hydrate ? _a : Ri)(e.component, {
      target: e.target,
      anchor: e.anchor,
      props: s,
      context: e.context,
      intro: (t = e.intro) !== null && t !== void 0 ? t : !1,
      recover: e.recover,
      transformError: e.transformError
    })), !st && (!(!(e == null || (r = e.props) === null || r === void 0) && r.$$host) || e.sync === !1) && Jr(), E(Ue, this, s.$$events);
    for (const a of Object.keys(o(xe, this)))
      a === "$set" || a === "$destroy" || a === "$on" || Pt(this, a, {
        get() {
          return o(xe, this)[a];
        },
        set(l) {
          o(xe, this)[a] = l;
        },
        enumerable: !0
      });
    o(xe, this).$set = (a) => {
      Object.assign(s, a);
    }, o(xe, this).$destroy = () => {
      ga(o(xe, this));
    };
  }
  $set(e) {
    o(xe, this).$set(e);
  }
  $on(e, t) {
    o(Ue, this)[e] = o(Ue, this)[e] || [];
    const r = (...n) => t.call(this, ...n);
    return o(Ue, this)[e].push(r), () => {
      o(Ue, this)[e] = o(Ue, this)[e].filter((n) => n !== r);
    };
  }
  $destroy() {
    o(xe, this).$destroy();
  }
}, zi;
typeof HTMLElement == "function" && (zi = class extends HTMLElement {
  constructor(e, t, r) {
    super(), P(this, "$$ctor", void 0), P(this, "$$s", void 0), P(this, "$$c", void 0), P(this, "$$cn", !1), P(this, "$$d", {}), P(this, "$$r", !1), P(this, "$$p_d", {}), P(this, "$$l", {}), P(this, "$$l_u", /* @__PURE__ */ new Map()), P(this, "$$me", void 0), P(this, "$$shadowRoot", null), this.$$ctor = e, this.$$s = t, r && (this.$$shadowRoot = this.attachShadow(r));
  }
  addEventListener(e, t, r) {
    if (this.$$l[e] = this.$$l[e] || [], this.$$l[e].push(t), this.$$c) {
      const n = this.$$c.$on(e, t);
      this.$$l_u.set(t, n);
    }
    super.addEventListener(e, t, r);
  }
  removeEventListener(e, t, r) {
    if (super.removeEventListener(e, t, r), this.$$c) {
      const n = this.$$l_u.get(t);
      n && (n(), this.$$l_u.delete(t));
    }
  }
  async connectedCallback() {
    if (this.$$cn = !0, !this.$$c) {
      let e = function(n) {
        return (i) => {
          const s = tn("slot");
          n !== "default" && (s.name = n), zr(i, s);
        };
      };
      if (await Promise.resolve(), !this.$$cn || this.$$c) return;
      const t = {}, r = Da(this);
      for (const n of this.$$s) n in r && (n === "default" && !this.$$d.children ? (this.$$d.children = e(n), t.default = !0) : t[n] = e(n));
      for (const n of this.attributes) {
        const i = this.$$g_p(n.name);
        i in this.$$d || (this.$$d[i] = Jt(i, n.value, this.$$p_d, "toProp"));
      }
      for (const n in this.$$p_d) !(n in this.$$d) && this[n] !== void 0 && (this.$$d[n] = this[n], delete this[n]);
      this.$$c = Wa({
        component: this.$$ctor,
        target: this.$$shadowRoot || this,
        props: te(te({}, this.$$d), {}, {
          $$slots: t,
          $$host: this
        })
      }), this.$$me = Hs(() => {
        dr(() => {
          this.$$r = !0;
          for (const i of Qt(this.$$c)) {
            var n;
            if (!(!((n = this.$$p_d[i]) === null || n === void 0) && n.reflect)) continue;
            this.$$d[i] = this.$$c[i];
            const s = Jt(i, this.$$d[i], this.$$p_d, "toAttribute");
            s == null ? this.removeAttribute(this.$$p_d[i].attribute || i) : this.setAttribute(this.$$p_d[i].attribute || i, s);
          }
          this.$$r = !1;
        });
      });
      for (const n in this.$$l) for (const i of this.$$l[n]) {
        const s = this.$$c.$on(n, i);
        this.$$l_u.set(i, s);
      }
      this.$$l = {};
    }
  }
  attributeChangedCallback(e, t, r) {
    var n;
    this.$$r || (e = this.$$g_p(e), this.$$d[e] = Jt(e, r, this.$$p_d, "toProp"), (n = this.$$c) === null || n === void 0 || n.$set({ [e]: this.$$d[e] }));
  }
  disconnectedCallback() {
    this.$$cn = !1, Promise.resolve().then(() => {
      !this.$$cn && this.$$c && (this.$$c.$destroy(), this.$$me(), this.$$c = void 0);
    });
  }
  $$g_p(e) {
    return Qt(this.$$p_d).find((t) => this.$$p_d[t].attribute === e || !this.$$p_d[t].attribute && t.toLowerCase() === e) || e;
  }
});
function Jt(e, t, r, n) {
  var i;
  const s = (i = r[e]) === null || i === void 0 ? void 0 : i.type;
  if (t = s === "Boolean" && typeof t != "boolean" ? t != null : t, !n || !r[e]) return t;
  if (n === "toAttribute") switch (s) {
    case "Object":
    case "Array":
      return t == null ? null : JSON.stringify(t);
    case "Boolean":
      return t ? "" : null;
    case "Number":
      return t == null ? null : t;
    default:
      return t;
  }
  else switch (s) {
    case "Object":
    case "Array":
      return t && JSON.parse(t);
    case "Boolean":
      return t;
    case "Number":
      return t != null ? +t : t;
    default:
      return t;
  }
}
function Da(e) {
  const t = {};
  return e.childNodes.forEach((r) => {
    t[r.slot || "default"] = !0;
  }), t;
}
function Ha(e, t, r, n, i, s) {
  let a = class extends zi {
    constructor() {
      super(e, r, i), this.$$p_d = t;
    }
    static get observedAttributes() {
      return Qt(t).map((l) => (t[l].attribute || l).toLowerCase());
    }
  };
  return Qt(t).forEach((l) => {
    Pt(a.prototype, l, {
      get() {
        return this.$$c && l in this.$$c ? this.$$c[l] : this.$$d[l];
      },
      set(f) {
        f = Jt(l, f, t), this.$$d[l] = f;
        var u = this.$$c;
        if (u) {
          var d;
          !((d = Ze(u, l)) === null || d === void 0) && d.get ? u[l] = f : u.$set({ [l]: f });
        }
      }
    });
  }), n.forEach((l) => {
    Pt(a.prototype, l, { get() {
      var f;
      return (f = this.$$c) === null || f === void 0 ? void 0 : f[l];
    } });
  }), s && (a = s(a)), e.element = a, a;
}
var Ba = /* @__PURE__ */ Oi('<button type="button"><img width="45" height="45" loading="lazy" decoding="async" class="block h-[45px] w-[45px] origin-center rounded-full object-contain svelte-19wflfl"/> <span class="count svelte-19wflfl"> </span> <small class="svelte-19wflfl"> </small></button>'), qa = /* @__PURE__ */ Oi('<div class="reaction svelte-19wflfl" aria-label="Emoji reactions"></div>'), Ua = {
  hash: "svelte-19wflfl",
  code: `:host {display:block;}.reaction.svelte-19wflfl {display:flex;justify-content:center;align-items:flex-start;gap:14px;flex-wrap:wrap;margin:25px 0;text-align:center;}button.svelte-19wflfl {position:relative;width:45px;height:45px;min-width:45px;min-height:45px;flex:0 0 45px;padding:0;border:0;background:transparent;cursor:pointer;}button.hot.svelte-19wflfl::before {position:absolute;top:-14px;left:-5px;width:55px;height:58px;z-index:0;border-radius:48% 48% 42% 42%;background:radial-gradient(ellipse at 50% 86%, rgba(255, 242, 92, .98) 0 22%, rgba(255, 145, 0, .92) 44%, transparent 72%),\r
      radial-gradient(ellipse at 25% 44%, rgba(255, 70, 0, .86) 0 17%, transparent 58%),\r
      radial-gradient(ellipse at 75% 40%, rgba(255, 24, 0, .8) 0 16%, transparent 55%);box-shadow:0 0 7px 2px rgba(255, 92, 0, .8);filter:blur(2px);content:"";pointer-events:none;\r
    animation: svelte-19wflfl-emoji-fire 1s ease-in-out infinite alternate;}img.svelte-19wflfl {display:block;position:relative;z-index:1;width:45px;height:45px;object-fit:contain;border-radius:50%;transform-origin:center;}.count.svelte-19wflfl {position:absolute;top:-8px;right:-10px;z-index:3;min-width:22px;box-sizing:border-box;padding:4px 8px;border-radius:999px;background:#ff4081;color:#fff;font:bold 12px/1 sans-serif;}small.svelte-19wflfl {display:block;position:relative;z-index:4;margin-top:4px;color:#a1a1a1;font:11px sans-serif;user-select:none;white-space:nowrap;}.bubble {position:absolute;bottom:calc(100% + 10px);left:50%;z-index:2;transform:translateX(-50%);padding:6px 10px;border:2px solid #000;border-radius:12px;background:#fff;color:#000;font:12px sans-serif;white-space:nowrap;\r
    animation: svelte-19wflfl-bubble .6s ease;}\r
\r
  @keyframes svelte-19wflfl-bubble {\r
    from {\r
      opacity: 0;\r
      transform: translate(-50%, 8px) scale(.8);\r
    }\r
  }\r
\r
  @keyframes svelte-19wflfl-emoji-fire {\r
    from {\r
      opacity: .7;\r
      transform: translateY(2px) scale(.94, .96);\r
    }\r
\r
    to {\r
      opacity: 1;\r
      transform: translateY(-1px) scale(1.05, 1.1);\r
    }\r
  }\r
\r
  @media (prefers-reduced-motion: reduce) {.svelte-19wflfl, .svelte-19wflfl::before, .svelte-19wflfl::after {animation-duration:.01ms !important;}\r
  }`
};
function Ya(e, t) {
  Dn(t, !1), Ea(e, Ua);
  let r = za(t, "pageId", 12, "");
  const n = "10.12.5", i = [
    "like",
    "haha",
    "wow",
    "sad",
    "angry2"
  ], s = {
    like: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEis9ZOW9esFuwM3vo5mtv16K8iK2NT2XpQFCxlEx2F7joVOd0BZWfSfdd9QPLwzAGa4UV4xEiVq8j5uIgYzT2GS1LGqQSJkB73XHwsZMDQJbgr1mlrbO_6PqsKtu0-jqzbKZO_32AG_FKhpUc5iM4L-IRTcRCLvdC14NP3gyeBMdGxJ7K1F6nm7_xrsZrE/s100/Untitled183_20260422193737.png",
    haha: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgveI8BS46sAgH4T-NemtemNvDPld6CKqG7xvbb4N6zErUMeOn-Dz6M1a4Fp3iquJv65HkuPEqZDSsFLGmTclRV-FZ2TkY42IBLO3jAaa_iVgH01-IFeFdIXQJSHUBDcwjShsXOac3C8gxGVASTHMOhv5xmbwX_v5ZdvPUysLfONpZjZG0R9bjTaS-ELCE/s100/Image_rof2zdrof2zdrof2.png",
    wow: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgaAnwz4Li06jCLLBrD8lpAuoiLkHs8il6r8OOYzaFUppECfsVlmoPAAZO0-f-p0hHfxPVclVRii4Duuky44n0_zZgmXo_mAS0HlWb9gAFeYySGXVNY2xw5W-xS_cOfi-muzfQUEMpqj-7gpZ0fQ1LxTMPyMuix7uCIrddJMdstb2RniNUsKhNH164Ar7I/s100/Crot.png",
    sad: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhBL_MNansQeOnqFrEl2xO-N4WA6T85OOV09eoV446UTUe1IDpN4UZKh_wSaHGhX8tbYFUwtP-7xuymqXyh94e8vd4kHigB9T19u0BwtEjFqS2PTu6R-Wf03PSzdARay2L9AyJO1S5L8_wnTKbK-KPlc12jS_q7HzZH5rSSOb-X1WmxFcghTFg7ClBdbW8/s100/sad.png",
    angry2: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh8l9NDdzOD9NrZmf4EJ0A0deOeUhb0kCPNYJlYyIn5U1X2bpmUCAP_Ww9bAQWpnkRq6y3lfnVlkssLpUp1jTskIwlYMgpGd1SFXclS7k4ZiPYlyd2GeLS3W9TstQ1zH7eU5Pf3fwk6Rs_4g-B144VvgJ0Rv5dPk_O_QXT9QbrDPJqZuyk-go1YQuPAiew/s100/angry.png"
  }, a = {
    like: "LIKE",
    haha: "LOL",
    wow: "CUM",
    sad: "SAD",
    angry2: "MAD"
  }, l = "emojiReactionCounts_v1", f = "qcrJ0azJRvSlShzcvXv178KrmMA2";
  let u = /* @__PURE__ */ Ot(Object.fromEntries(i.map((y) => [y, 0]))), d = /* @__PURE__ */ Ot(""), c = null, v = null, h = null, g = null, _ = null, p = null, m = null, j = /* @__PURE__ */ Ot(null);
  const R = /* @__PURE__ */ new Set(), z = /* @__PURE__ */ new Set(), G = (y) => `emoji_${y || "global_0"}`.replace(/\W/g, "_"), A = (y) => {
    try {
      return JSON.parse(localStorage.getItem(l) || "{}")[y];
    } catch (w) {
      return console.warn("Could not read cached emoji counts.", w), null;
    }
  }, q = (y) => {
    try {
      const w = JSON.parse(localStorage.getItem(l) || "{}");
      w[y] = te({}, x(u));
      const b = Object.keys(w);
      b.slice(0, Math.max(0, b.length - 20)).forEach((M) => delete w[M]), localStorage.setItem(l, JSON.stringify(w));
    } catch (w) {
      console.warn("Could not save cached emoji counts.", w);
    }
  }, U = (y) => Object.fromEntries(i.map((w) => [w, typeof y[w] == "number" && Number.isFinite(y[w]) ? y[w] : 0]));
  async function yt() {
    if (v) return v;
    const [y, w, b] = await Promise.all([
      import(
        /* @vite-ignore */
        `https://www.gstatic.com/firebasejs/${n}/firebase-app.js`
      ),
      import(
        /* @vite-ignore */
        `https://www.gstatic.com/firebasejs/${n}/firebase-firestore.js`
      ),
      import(
        /* @vite-ignore */
        `https://www.gstatic.com/firebasejs/${n}/firebase-auth.js`
      )
    ]);
    return v = te(te(te({}, y), w), b), v;
  }
  async function X(y) {
    var w, b;
    if (!y || y === x(d)) return;
    K(d, y), p == null || p();
    const M = await yt();
    if ((w = h) !== null && w !== void 0 || (h = M.initializeApp({
      apiKey: "AIzaSyAwXK4q1t_0HVA-eZN22PIlKgJ3zYXIuAs",
      projectId: "emoji-reaction-fb044"
    }, "mikoroku-emoji-reaction")), !g) try {
      g = M.initializeFirestore(h, { localCache: M.persistentLocalCache({ tabManager: M.persistentMultipleTabManager() }) });
    } catch (Q) {
      console.warn("Emoji persistent cache unavailable; using the default Firestore cache.", Q), g = M.getFirestore(h);
    }
    const C = g, Y = M.getAuth(h), D = G(y), J = A(D);
    J && K(u, U(J)), _ = M.doc(C, "emoji_reactions", D), (b = m) !== null && b !== void 0 || (m = M.onAuthStateChanged(Y, (Q) => {
      c = Q;
    })), p = M.onSnapshot(_, (Q) => {
      const Ae = U(Q.data());
      K(u, Object.fromEntries(i.map((ee) => [ee, z.has(ee) && x(u)[ee] > Ae[ee] ? x(u)[ee] : Ae[ee]]))), q(D);
    }, (Q) => console.warn("Emoji listener failed.", Q));
  }
  function be(y, w) {
    const b = document.createElement("span");
    b.className = "bubble", b.textContent = w, y.appendChild(b), setTimeout(() => b.remove(), 1900);
  }
  function he(y, w) {
    if (document.documentElement.classList.contains("no-animations") || document.body.classList.contains("no-animations")) return;
    const b = y.querySelector("img");
    b && (b.classList.remove("active"), b.offsetWidth, b.classList.add("active", w), w === "like" && $e(y, b), w === "haha" && bt(y, b), w === "wow" && (b.classList.remove("active", w), vr(y)), w === "sad" && Re(y), w === "angry2" && (b.classList.remove("active", w), Le(y, b)));
  }
  function $e(y, w) {
    const b = y.getBoundingClientRect();
    for (let M = 0; M < 14; M += 1) {
      const C = document.createElement("i"), Y = Math.random() * Math.PI * 2, D = 70 + Math.random() * 80;
      Object.assign(C.style, {
        position: "fixed",
        left: `${b.left + b.width / 2}px`,
        top: `${b.top + b.height / 2}px`,
        width: "10px",
        height: "10px",
        borderRadius: "50%",
        pointerEvents: "none",
        zIndex: "9999",
        background: "radial-gradient(circle, #fff176, #ff9800, #ff5722)",
        filter: "blur(1px)"
      }), document.body.appendChild(C), C.animate([{
        transform: "translate(0,0) scale(1)",
        opacity: 1
      }, {
        transform: `translate(${Math.cos(Y) * D}px,${Math.sin(Y) * D}px) scale(.5)`,
        opacity: 0
      }], {
        duration: 700,
        easing: "ease-out"
      }).finished.then(() => C.remove()).catch(() => C.remove());
    }
    w.animate([{ transform: "rotate(0deg) scale(1)" }, { transform: "rotate(1440deg) scale(1.15)" }], {
      duration: 5200,
      easing: "cubic-bezier(.2,.8,.2,1)",
      fill: "forwards"
    });
  }
  function bt(y, w) {
    const b = y.getBoundingClientRect(), M = b.left + b.width / 2, C = b.top + b.height / 2, Y = [{
      x: 0,
      y: 0
    }];
    let D = M, J = C, Q = (Math.random() * 6 + 4) * (Math.random() > 0.5 ? 1 : -1), Ae = (Math.random() * 6 + 4) * (Math.random() > 0.5 ? 1 : -1);
    for (let ee = 0; ee < 6; ee += 1)
      D += Q * 80, J += Ae * 80, (D < 0 || D > innerWidth) && (Q *= -1), (J < 0 || J > innerHeight) && (Ae *= -1), Y.push({
        x: Math.max(0, Math.min(innerWidth, D)) - M,
        y: Math.max(0, Math.min(innerHeight, J)) - C
      });
    Y.push({
      x: 0,
      y: 0
    }), w.animate(Y.map((ee) => ({ transform: `translate(${ee.x}px,${ee.y}px)` })), {
      duration: 3e3,
      easing: "cubic-bezier(.2,.8,.2,1)"
    });
  }
  function vr(y) {
    const w = y.getBoundingClientRect();
    let b = document.getElementById("mikoroku-emoji-slime");
    if (!b) {
      b = document.createElement("div"), b.id = "mikoroku-emoji-slime", Object.assign(b.style, {
        position: "fixed",
        inset: "0",
        pointerEvents: "none",
        zIndex: "9999",
        filter: "url(#mikoroku-emoji-goo)"
      });
      const M = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      M.setAttribute("aria-hidden", "true"), M.style.cssText = "position:absolute;width:0;height:0", M.innerHTML = '<defs><filter id="mikoroku-emoji-goo"><feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur"/><feColorMatrix in="blur" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 20 -8" result="goo"/><feComposite in="SourceGraphic" in2="goo" operator="atop"/></filter></defs>', b.appendChild(M), document.body.appendChild(b);
    }
    for (let M = 0; M < 14; M += 1) {
      const C = document.createElement("i"), Y = 22 + Math.random() * 40;
      Object.assign(C.style, {
        position: "absolute",
        left: `${w.left + w.width / 2 - Y / 2}px`,
        top: `${w.top + w.height / 2 - Y * 1.2 / 2}px`,
        width: `${Y}px`,
        height: `${Y * 1.5}px`,
        borderRadius: "50%",
        pointerEvents: "none",
        zIndex: "9999",
        background: "white",
        opacity: "0"
      }), b.appendChild(C);
      const D = Math.random() * 200 - 100, J = -250 - Math.random() * 200, Q = D * 1.1 + (Math.random() * 60 - 30), Ae = 1400 + Math.random() * 400, ee = C.animate([{
        transform: "translate(0,0) scale(.4,1.6)",
        opacity: 0
      }, {
        transform: `translate(${D}px,${J}px) scale(1.4,.9)`,
        opacity: 0.95
      }], {
        duration: 2200,
        delay: Math.random() * 400,
        easing: "cubic-bezier(.2,.8,.3,1)",
        fill: "forwards"
      });
      window.setTimeout(() => {
        ee.cancel(), C.animate([{
          transform: `translate(${D}px,${J}px) scale(1.3,1)`,
          opacity: 0.9
        }, {
          transform: `translate(${Q}px,110vh) scale(.9,1.4)`,
          opacity: 0
        }], {
          duration: 4800,
          easing: "ease-in",
          fill: "forwards"
        }).finished.then(() => C.remove()).catch(() => C.remove());
      }, Ae);
    }
  }
  function Re(y) {
    const w = y.getBoundingClientRect();
    for (let b = 0; b < 18; b += 1) {
      const M = document.createElement("i"), C = 5 + Math.random() * 7;
      Object.assign(M.style, {
        position: "fixed",
        left: `${w.left + w.width / 2 + Math.random() * 22 - 11}px`,
        top: `${w.top + 10}px`,
        width: `${C}px`,
        height: `${C * 1.8}px`,
        borderRadius: "50%",
        pointerEvents: "none",
        zIndex: "9999",
        background: "linear-gradient(transparent,#81d4fa,#29b6f6)",
        boxShadow: "0 0 6px #81d4fa"
      }), document.body.appendChild(M), M.animate([{
        transform: "translate(0,0) scale(.4)",
        opacity: 0.9
      }, {
        transform: `translate(${Math.random() * 45 - 22}px,210px) scale(1.15)`,
        opacity: 0
      }], {
        duration: 2400 + Math.random() * 1e3,
        delay: b * 65
      }).finished.then(() => M.remove()).catch(() => M.remove());
    }
  }
  function Le(y, w) {
    w.animate([
      { transform: "scale(1) translate(0,0) rotate(0deg)" },
      { transform: "scale(1.14) translate(-7px,4px) rotate(-7deg)" },
      { transform: "scale(1.2) translate(8px,-5px) rotate(7deg)" },
      { transform: "scale(1.3) translate(-14px,8px) rotate(-12deg)" },
      { transform: "scale(1.36) translate(15px,-10px) rotate(13deg)" },
      { transform: "scale(1.38) translate(-17px,11px) rotate(-15deg)" },
      { transform: "scale(1.36) translate(17px,-11px) rotate(15deg)" },
      { transform: "scale(1.4) translate(-18px,12px) rotate(-16deg)" },
      { transform: "scale(1.38) translate(18px,-12px) rotate(16deg)" },
      {
        transform: "scale(1.42) translate(-15px,10px) rotate(-14deg)",
        filter: "drop-shadow(0 0 18px red) saturate(2)"
      },
      { transform: "scale(1.34) translate(12px,-8px) rotate(11deg)" },
      { transform: "scale(1.28) translate(-10px,6px) rotate(-9deg)" },
      { transform: "scale(1.18) translate(6px,-4px) rotate(6deg)" },
      { transform: "scale(1.1) translate(-3px,2px) rotate(-3deg)" },
      {
        transform: "scale(1) translate(0,0) rotate(0deg)",
        filter: "drop-shadow(0 0 0 red)"
      }
    ], {
      duration: 3e3,
      easing: "linear"
    }), y.animate([{ filter: "brightness(1.4) saturate(1.8)" }, { filter: "none" }], { duration: 300 });
  }
  async function Z(y, w) {
    const b = `${x(d)}_${y}`;
    if (R.has(b)) return;
    R.add(b);
    const M = `reacted_${x(d)}_${y}`;
    try {
      var C, Y;
      const D = (c == null ? void 0 : c.uid) === f;
      if (!D && localStorage.getItem(M)) {
        be(w, "Already selected!");
        return;
      }
      if (!_ || !v) throw new Error("Emoji reaction page is not ready.");
      K(u, te(te({}, x(u)), {}, { [y]: x(u)[y] + 1 })), z.add(y), he(w, y), (C = (Y = navigator).vibrate) === null || C === void 0 || C.call(Y, 30), D || localStorage.setItem(M, "1"), await v.setDoc(_, { [y]: v.increment(1) }, { merge: !0 }), q(G(x(d))), setTimeout(() => z.delete(y), 1500);
    } catch (D) {
      K(u, te(te({}, x(u)), {}, { [y]: Math.max(0, x(u)[y] - 1) })), D instanceof Error && console.error("Failed to save emoji reaction.", D), be(w, "Failed to save. Try again.");
      try {
        localStorage.removeItem(M);
      } catch (J) {
        console.warn("Could not clear emoji vote lock.", J);
      }
    } finally {
      R.delete(b);
    }
  }
  ma(() => {
    const y = document.querySelector("mikoroku-emoji-reaction");
    return y && y.classList.add("block"), K(j, X(r()).catch((w) => console.error("Failed to initialize emoji reaction.", w)).finally(() => {
      K(j, null);
    })), () => {
      p == null || p(), m == null || m(), p = null, m = null;
    };
  }), Us(() => (Ai(r()), x(d), x(j)), () => {
    r() && r() !== x(d) && !x(j) && K(j, X(r()).finally(() => {
      K(j, null);
    }));
  }), Ys();
  var Wi = {
    get pageId() {
      return r();
    },
    set pageId(y) {
      r(y), Jr();
    }
  };
  Ia();
  var hr = qa();
  return $a(hr, 5, () => i, ya, (y, w) => {
    var b = Ba();
    let M;
    var C = ui(b), Y = _n(C, 2), D = pn(Y, !0), J = _n(Y, 2), Q = pn(J, !0);
    Ar(b), Ks(() => {
      xr(b, "aria-label", (x(w), ke(() => a[x(w)]))), M = Ma(b, 1, "relative h-[45px] min-h-[45px] w-[45px] min-w-[45px] cursor-pointer border-0 bg-transparent p-0 svelte-19wflfl", null, M, { hot: x(u)[x(w)] >= 10 }), xr(C, "src", (x(w), ke(() => s[x(w)]))), xr(C, "alt", (x(w), ke(() => a[x(w)]))), kn(D, (x(u), x(w), ke(() => x(u)[x(w)]))), kn(Q, (x(w), ke(() => a[x(w)])));
    }), ra("click", b, (Ae) => Z(x(w), Ae.currentTarget)), zr(y, b);
  }), Ar(hr), zr(e, hr), Hn(Wi);
}
customElements.define("mikoroku-emoji-reaction", Ha(Ya, { pageId: {} }, [], [], { mode: "open" }));
export {
  Ya as default
};
