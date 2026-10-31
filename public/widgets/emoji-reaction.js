if (typeof window != "undefined") {
  var sn, pr, an, _r;
  ((pr = (sn = (_r = (an = window).__svelte) !== null && _r !== void 0 ? _r : an.__svelte = {}).v) !== null && pr !== void 0 ? pr : sn.v = /* @__PURE__ */ new Set()).add("5");
}
var st = !1, gt = !1;
function Ni() {
  gt = !0;
}
Ni();
var He = {}, q = /* @__PURE__ */ Symbol("uninitialized");
var Wi = "http://www.w3.org/1999/xhtml", Tn = Array.isArray, zi = Array.prototype.indexOf, Pt = Array.prototype.includes, ur = Array.from, Qt = Object.keys, Rt = Object.defineProperty, Ze = Object.getOwnPropertyDescriptor, An = Object.getOwnPropertyDescriptors, Fi = Object.prototype, Di = Array.prototype, Br = Object.getPrototypeOf, ln = Object.isExtensible, Hi = () => {
};
function Bi(e) {
  return e();
}
function Er(e) {
  for (var t = 0; t < e.length; t++) e[t]();
}
function On() {
  var e, t;
  return {
    promise: new Promise((r, n) => {
      e = r, t = n;
    }),
    resolve: e,
    reject: t
  };
}
function Ct(e) {
  "@babel/helpers - typeof";
  return Ct = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
    return typeof t;
  } : function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, Ct(e);
}
function Ui(e, t) {
  if (Ct(e) != "object" || !e) return e;
  var r = e[Symbol.toPrimitive];
  if (r !== void 0) {
    var n = r.call(e, t || "default");
    if (Ct(n) != "object") return n;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
function qi(e) {
  var t = Ui(e, "string");
  return Ct(t) == "symbol" ? t : t + "";
}
function P(e, t, r) {
  return (t = qi(t)) in e ? Object.defineProperty(e, t, {
    value: r,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : e[t] = r, e;
}
var gr, Ba = 1 << 24, ce = 1024, ie = 2048, je = 4096, Ur = 8192, jn = 16384, qr = 32768, Sr = 1 << 25, Pn = 65536, Ua = 1 << 17, qa = 1 << 18, mt = 1 << 19, Rn = 1 << 20, Tt = 1 << 25, on = 1 << 21, Vi = 1 << 22, er = 1 << 23, ht = /* @__PURE__ */ Symbol("$state"), Cn = /* @__PURE__ */ Symbol("component"), In = /* @__PURE__ */ Symbol("legacy props"), Yi = /* @__PURE__ */ Symbol(""), Ki = /* @__PURE__ */ Symbol("proxy path"), Mr = /* @__PURE__ */ Symbol("attributes"), Xi = /* @__PURE__ */ Symbol("class"), Gi = /* @__PURE__ */ Symbol("style"), Xt = /* @__PURE__ */ Symbol("text"), zt = new class extends Error {
  constructor(...t) {
    super(...t), P(this, "name", "StaleReactionError"), P(this, "message", "The reaction that called `getAbortSignal()` was re-run or destroyed");
  }
}(), Zi = !!(!((gr = globalThis.document) === null || gr === void 0) && gr.contentType) && /* @__PURE__ */ globalThis.document.contentType.includes("xml");
function Ji() {
  console.warn("https://svelte.dev/e/derived_inert");
}
function Qi(e, t, r) {
  console.warn("https://svelte.dev/e/hydration_attribute_changed");
}
function cr(e) {
  console.warn("https://svelte.dev/e/hydration_mismatch");
}
function es() {
  console.warn("https://svelte.dev/e/svelte_boundary_reset_noop");
}
var z = !1;
function Ke(e) {
  z = e;
}
var F;
function fe(e) {
  if (e === null)
    throw cr(), He;
  return F = e;
}
function Vr() {
  return fe(/* @__PURE__ */ Pe(F));
}
function Tr(e) {
  if (z) {
    if (/* @__PURE__ */ Pe(F) !== null)
      throw cr(), He;
    F = e;
  }
}
function ts(e = 1) {
  if (z) {
    for (var t = e, r = F; t--; ) r = /* @__PURE__ */ Pe(r);
    F = r;
  }
}
function Ar(e = !0) {
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
function Ln(e) {
  if (!e || e.nodeType !== 8)
    throw cr(), He;
  return e.data;
}
function Nn(e) {
  return e === this.v;
}
function rs(e, t) {
  return e != e ? t == t : e !== t || e !== null && typeof e == "object" || typeof e == "function";
}
function Wn(e) {
  return !rs(e, this.v);
}
function ns(e) {
  throw new Error("https://svelte.dev/e/lifecycle_outside_component");
}
function is() {
  throw new Error("https://svelte.dev/e/async_derived_orphan");
}
function ss(e, t, r) {
  throw new Error("https://svelte.dev/e/each_key_duplicate");
}
function as(e) {
  throw new Error("https://svelte.dev/e/effect_in_teardown");
}
function ls() {
  throw new Error("https://svelte.dev/e/effect_in_unowned_derived");
}
function os(e) {
  throw new Error("https://svelte.dev/e/effect_orphan");
}
function fs() {
  throw new Error("https://svelte.dev/e/effect_update_depth_exceeded");
}
function us() {
  throw new Error("https://svelte.dev/e/hydration_failed");
}
function cs(e) {
  throw new Error("https://svelte.dev/e/props_invalid_value");
}
function ds() {
  throw new Error("https://svelte.dev/e/state_descriptors_fixed");
}
function vs() {
  throw new Error("https://svelte.dev/e/state_prototype_fixed");
}
function hs() {
  throw new Error("https://svelte.dev/e/state_unsafe_mutation");
}
function ps() {
  throw new Error("https://svelte.dev/e/svelte_boundary_reset_onerror");
}
function fn(e, t) {
  return e.label = t, _s(e.v, t), e;
}
function _s(e, t) {
  var r;
  return e == null || (r = e[Ki]) === null || r === void 0 || r.call(e, t), e;
}
function un(e, t) {
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
    t % 2 ? un(Object(r), !0).forEach(function(n) {
      P(e, n, r[n]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : un(Object(r)).forEach(function(n) {
      Object.defineProperty(e, n, Object.getOwnPropertyDescriptor(r, n));
    });
  }
  return e;
}
var N = null;
function pt(e) {
  N = e;
}
function zn(e, t = !1, r) {
  N = {
    p: N,
    i: !1,
    c: null,
    e: null,
    s: e,
    x: null,
    r: S,
    l: gt && !t ? {
      s: null,
      u: null,
      $: []
    } : null
  };
}
function Fn(e) {
  var t = N, r = t.e;
  if (r !== null) {
    t.e = null;
    for (var n of r) vi(n);
  }
  if (e !== void 0 && (t.x = e), t.i = !0, N = t.p, 0)
    var i;
  return Dn(e);
}
function Dn(e = {}) {
  return Rt(e, Cn, { value: !0 }), e;
}
function Ft() {
  return !gt || N !== null && N.l === null;
}
var Xe = [];
function Hn() {
  var e = Xe;
  Xe = [], Er(e);
}
function Ae(e) {
  if (Xe.length === 0 && !At) {
    var t = Xe;
    queueMicrotask(() => {
      t === Xe && Hn();
    });
  }
  Xe.push(e);
}
function gs() {
  for (; Xe.length > 0; ) Hn();
}
var ms = ~(ie | je | ce);
function H(e, t) {
  e.f = e.f & ms | t;
}
function Yr(e) {
  (e.f & 512) !== 0 || e.deps === null ? H(e, ce) : H(e, je);
}
function Bn(e, t) {
  (e.f & 2048) !== 0 ? t.set(e, ie) : (e.f & 4096) !== 0 && t.get(e) !== 2048 && t.set(e, je), H(e, ce);
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
function ws(e, t) {
  this.v = e, this.k = t;
}
function Ht(e) {
  var t, r;
  function n(s, a) {
    try {
      var l = e[s](a), f = l.value, u = f instanceof ws;
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
function ys(e, t, r, n) {
  const i = Ft() ? It : Kr;
  var s = e.filter((h) => !h.settled), a = t.map(i);
  if (r.length === 0 && s.length === 0) {
    n(a);
    return;
  }
  var l = S, f = bs(), u = s.length === 1 ? s[0].promise : s.length > 1 ? Promise.all(s.map((h) => h.promise)) : null;
  function d(h) {
    if ((l.f & 16384) === 0) {
      f();
      try {
        n([...a, ...h]);
      } catch (g) {
        Se(g, l);
      }
      tr();
    }
  }
  var c = Un();
  if (r.length === 0) {
    u.then(() => d([])).finally(c);
    return;
  }
  function v() {
    Promise.all(r.map((h) => /* @__PURE__ */ xs(h))).then(d).catch((h) => Se(h, l)).finally(c);
  }
  u ? u.then(() => {
    if ((l.f & 16384) !== 0) {
      c();
      return;
    }
    f(), v(), tr();
  }) : v();
}
function bs() {
  var e = S, t = T, r = N, n = x;
  if (0) var i;
  return function(a = !0) {
    ve(e), de(t), pt(r), a && (e.f & 16384) === 0 && (n == null || n.activate(), n == null || n.apply());
  };
}
var $s = !1;
function tr(e = !0) {
  $s = !1, ve(null), de(null), pt(null), e && (x == null || x.deactivate());
}
function Un() {
  var e = S, t = e.b, r = x, n = !!(t != null && t.is_rendered());
  return t == null || t.update_pending_count(1, r), r.increment(n, e), () => {
    t == null || t.update_pending_count(-1, r), r.decrement(n, e);
  };
}
// @__NO_SIDE_EFFECTS__
function It(e) {
  var t = 2 | ie;
  return S !== null && (S.f |= mt), {
    ctx: N,
    deps: null,
    effects: null,
    equals: Nn,
    f: t,
    fn: e,
    reactions: null,
    rv: 0,
    v: q,
    wv: 0,
    parent: S,
    ac: null
  };
}
var xt = /* @__PURE__ */ Symbol("obsolete");
// @__NO_SIDE_EFFECTS__
function xs(e, t, r) {
  let n = S;
  n === null && is();
  var i = void 0, s = rt(q), a = !T, l = /* @__PURE__ */ new Set();
  return qs(() => {
    var f = S, u = On();
    i = u.promise;
    try {
      Promise.resolve(e()).then(u.resolve, (_) => {
        _ !== zt && u.reject(_);
      }).finally(tr);
    } catch (_) {
      u.reject(_), tr();
    }
    var d = x;
    if (a) {
      var c;
      if ((f.f & 32768) !== 0) var v = Un();
      if (!((c = n.b) === null || c === void 0) && c.is_rendered()) {
        var h;
        (h = d.async_deriveds.get(f)) === null || h === void 0 || h.reject(xt);
      } else for (const _ of l.values()) _.reject(xt);
      l.add(u), d.async_deriveds.set(f, u);
    }
    const g = (_, p = void 0) => {
      v == null || v(), l.delete(u), p !== xt && (d.activate(), p ? (s.f |= er, _t(s, p)) : ((s.f & 8388608) !== 0 && (s.f ^= er), _t(s, _)), d.deactivate());
    };
    u.promise.then(g, (_) => g(null, _ || "unknown"));
  }), di(() => {
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
function Kr(e) {
  const t = /* @__PURE__ */ It(e);
  return t.equals = Wn, t;
}
function ks(e) {
  var t = e.effects;
  if (t !== null) {
    e.effects = null;
    for (var r = 0; r < t.length; r += 1) ue(t[r]);
  }
}
function Xr(e) {
  var t, r = S, n = e.parent;
  if (!Oe && n !== null && e.v !== q && (n.f & 24576) !== 0)
    return Ji(), e.v;
  ve(n);
  try {
    ks(e), t = ki(e);
  } finally {
    ve(r);
  }
  return t;
}
function qn(e) {
  var t = Xr(e);
  if (!e.equals(t) && (e.wv = $i(), (!(x != null && x.is_fork) || e.deps === null) && (x !== null ? (x.capture(e, t, !0), We == null || We.capture(e, t, !0)) : e.v = t, e.deps === null))) {
    H(e, ce);
    return;
  }
  Oe || (B !== null ? (tn() || x != null && x.is_fork) && B.set(e, t) : Yr(e));
}
function Es(e) {
  if (e.effects !== null) {
    for (const r of e.effects) if (r.teardown || r.ac) {
      var t;
      (t = r.teardown) === null || t === void 0 || t.call(r), r.ac !== null && Dt(() => {
        r.ac.abort(zt), r.ac = null;
      }), r.fn !== null && (r.teardown = Hi), Nt(r, 0), rn(r);
    }
  }
}
function Vn(e) {
  if (e.effects !== null)
    for (const t of e.effects) t.teardown && t.fn !== null && it(t);
}
function Yn(e, t) {
  if (t.has(e)) throw new TypeError("Cannot initialize the same private elements twice on an object");
}
function Gr(e, t) {
  Yn(e, t), t.add(e);
}
function O(e, t, r) {
  Yn(e, t), t.set(e, r);
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
var Kn, rr = null, ft = null, x = null, We = null, B = null, Or = null, At = !1, mr = !1, Lt = null, nr = null, Xn = 0;
var Ss = 1, ir = /* @__PURE__ */ new WeakMap(), Bt = /* @__PURE__ */ new WeakMap(), ut = /* @__PURE__ */ new WeakMap(), Ve = /* @__PURE__ */ new WeakMap(), kt = /* @__PURE__ */ new WeakMap(), tt = /* @__PURE__ */ new WeakMap(), jr = /* @__PURE__ */ new WeakMap(), ze = /* @__PURE__ */ new WeakMap(), Ne = /* @__PURE__ */ new WeakMap(), Gt = /* @__PURE__ */ new WeakMap(), Et = /* @__PURE__ */ new WeakMap(), I = /* @__PURE__ */ new WeakSet(), at = class Gn {
  constructor() {
    Gr(this, I), P(this, "id", Ss++), P(this, "started", !1), P(this, "linked", !0), P(this, "prev", null), P(this, "next", null), P(this, "async_deriveds", /* @__PURE__ */ new Map()), P(this, "current", /* @__PURE__ */ new Map()), P(this, "previous", /* @__PURE__ */ new Map()), O(this, ir, /* @__PURE__ */ new Set()), O(this, Bt, /* @__PURE__ */ new Set()), O(this, ut, 0), O(this, Ve, /* @__PURE__ */ new Map()), O(this, kt, null), O(this, tt, []), O(this, jr, []), O(this, ze, /* @__PURE__ */ new Map()), O(this, Ne, /* @__PURE__ */ new Map()), O(this, Gt, /* @__PURE__ */ new Set()), P(this, "is_fork", !1), O(this, Et, !1), ft === null ? rr = ft = this : (ft.next = this, this.prev = ft), ft = this;
  }
  skip_effect(t) {
    o(Ne, this).has(t) || o(Ne, this).set(t, {
      d: [],
      m: []
    }), o(Gt, this).delete(t);
  }
  unskip_effect(t, r = (n) => this.schedule(n)) {
    var n = o(Ne, this).get(t);
    if (n) {
      o(Ne, this).delete(t);
      for (var i of n.d)
        H(i, ie), r(i);
      for (i of n.m)
        H(i, je), r(i);
    }
    o(Gt, this).add(t);
  }
  capture(t, r, n = !1) {
    t.v !== q && !this.previous.has(t) && this.previous.set(t, t.v), (t.f & 8388608) === 0 && (this.current.set(t, [r, n]), B == null || B.set(t, r)), this.is_fork || (t.v = r);
  }
  activate() {
    x = this;
  }
  deactivate() {
    x = null, B = null;
  }
  flush() {
    try {
      mr = !0, x = this, $(I, this, sr).call(this);
    } finally {
      Xn = 0, Or = null, Lt = null, nr = null, mr = !1, x = null, B = null, Ee.clear();
    }
  }
  discard() {
    var t;
    for (const r of o(Bt, this)) r(this);
    o(Bt, this).clear();
    for (const r of this.async_deriveds.values()) r.reject(xt);
    $(I, this, ar).call(this), (t = o(kt, this)) === null || t === void 0 || t.resolve();
  }
  register_created_effect(t) {
    o(jr, this).push(t);
  }
  increment(t, r) {
    if (E(ut, this, o(ut, this) + 1), t) {
      var n;
      let i = (n = o(Ve, this).get(r)) !== null && n !== void 0 ? n : 0;
      o(Ve, this).set(r, i + 1);
    }
  }
  decrement(t, r) {
    if (E(ut, this, o(ut, this) - 1), t) {
      var n;
      let i = (n = o(Ve, this).get(r)) !== null && n !== void 0 ? n : 0;
      i === 1 ? o(Ve, this).delete(r) : o(Ve, this).set(r, i - 1);
    }
    o(Et, this) || (E(Et, this, !0), Ae(() => {
      E(Et, this, !1), this.linked && this.flush();
    }));
  }
  transfer_reactions(t) {
    for (const [r, n] of t) this.add_dirty_reaction(r, n);
    t.clear();
  }
  add_dirty_reaction(t, r) {
    (r === 2048 || o(ze, this).get(t) !== 2048) && o(ze, this).set(t, r);
  }
  oncommit(t) {
    o(ir, this).add(t);
  }
  ondiscard(t) {
    o(Bt, this).add(t);
  }
  settled() {
    var t;
    return ((t = o(kt, this)) !== null && t !== void 0 ? t : E(kt, this, On())).promise;
  }
  static ensure() {
    if (x === null) {
      const t = x = new Gn();
      !mr && !At && Ae(() => {
        t.started || t.flush();
      });
    }
    return x;
  }
  apply() {
    if (!st || !this.is_fork && this.prev === null && this.next === null) {
      B = null;
      return;
    }
    B = /* @__PURE__ */ new Map();
    for (const [t, [r]] of this.current) B.set(t, r);
    for (let t = rr; t !== null; t = t.next)
      if (!(t === this || t.is_fork) && (t.id >= this.id || !$(I, t, Qn).call(t, this)))
        for (const [r, n] of t.previous) B.has(r) || B.set(r, n);
  }
  schedule(t) {
    var r;
    if (Or = t, !((r = t.b) === null || r === void 0) && r.is_pending && (t.f & 16777228) !== 0 && (t.f & 32768) === 0) {
      t.b.defer_effect(t);
      return;
    }
    o(tt, this).push(t);
  }
};
Kn = at;
function cn() {
  if (this.is_fork) return !0;
  for (const e of o(Ve, this).keys()) if (!$(I, this, Ms).call(this, e)) return !0;
  return !1;
}
function Ms(e) {
  for (var t = e; t !== null; t = t.parent) if (o(Ne, this).has(t)) return !0;
  return !1;
}
function Zn() {
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
  for (const [l, f] of o(ze, this))
    H(l, f), this.schedule(l);
  this.apply();
  for (var t = Lt = [], r = [], n = nr = []; o(tt, this).length > 0; ) {
    Xn++ > 1e3 && ($(I, this, ar).call(this), js());
    for (const l of $(I, this, Zn).call(this)) try {
      $(I, this, Jn).call(this, l, t, r);
    } catch (f) {
      throw ri(l), $(I, this, cn).call(this) || this.discard(), f;
    }
  }
  if (x = null, n.length > 0) {
    var i = Kn.ensure();
    for (const l of n) i.schedule(l);
  }
  if (Lt = null, nr = null, $(I, this, cn).call(this)) {
    $(I, this, St).call(this, r), $(I, this, St).call(this, t);
    for (const [l, f] of o(Ne, this)) ti(l, f);
    n.length > 0 && $(I, x, sr).call(x);
    return;
  }
  const s = $(I, this, Ts).call(this);
  if (s) {
    $(I, this, St).call(this, r), $(I, this, St).call(this, t), $(I, s, As).call(s, this);
    return;
  }
  o(ze, this).clear();
  for (const l of o(ir, this)) l(this);
  o(ir, this).clear(), We = this, dn(r), dn(t), We = null, (e = o(kt, this)) === null || e === void 0 || e.resolve();
  var a = x;
  o(ut, this) === 0 && (o(tt, this).length === 0 || a !== null) && ($(I, this, ar).call(this), st && ($(I, this, Os).call(this), x = a)), a !== null && (Ee.clear(), $(I, a, sr).call(a));
}
function Jn(e, t, r) {
  e.f ^= ce;
  for (var n = e.first; n !== null; ) {
    var i = n.f, s = (i & 96) !== 0;
    if (!(s && (i & 1024) !== 0 || (i & 8192) !== 0 || o(Ne, this).has(n)) && n.fn !== null) {
      s ? n.f ^= ce : (i & 4) !== 0 ? t.push(n) : st && (i & 16777224) !== 0 ? r.push(n) : yt(n) && ((i & 16) !== 0 && this.add_dirty_reaction(n, je), it(n));
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
function Ts() {
  for (var e = this.prev; e !== null; e = e.prev) if (!e.is_fork && $(I, this, Qn).call(this, e)) return e;
  return null;
}
function Qn(e) {
  for (const [t, [, r]] of this.current)
    if (!r && e.current.has(t))
      return !0;
  return !1;
}
function As(e) {
  for (const [r, n] of e.current)
    !this.previous.has(r) && e.previous.has(r) && this.previous.set(r, e.previous.get(r)), this.current.set(r, n);
  for (const [r, n] of e.async_deriveds) {
    const i = this.async_deriveds.get(r);
    i && n.promise.then(i.resolve).catch(i.reject);
  }
  e.async_deriveds.clear(), this.transfer_reactions(o(ze, e));
  const t = (r) => {
    var n = r.reactions;
    if (n !== null && !((r.f & 2) !== 0 && (r.f & 6144) === 0))
      for (const a of n) {
        var i = a.f;
        if ((i & 2) !== 0) t(a);
        else {
          var s = a;
          i & 4194320 && !this.async_deriveds.has(s) && (o(ze, this).delete(s), H(s, ie), this.schedule(s));
        }
      }
  };
  for (const r of this.current.keys()) t(r);
  this.oncommit(() => e.discard()), $(I, e, ar).call(e), x = this, $(I, this, sr).call(this);
}
function St(e) {
  for (var t = 0; t < e.length; t += 1) Bn(e[t], o(ze, this));
}
function Os() {
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
        if (e) for (const c of o(Gt, this)) d.unskip_effect(c, (v) => {
          (v.f & 4194320) !== 0 ? d.schedule(v) : $(I, d, St).call(d, [v]);
        });
        d.activate();
        var s = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Map();
        for (var l of t) ei(l, i, s, a);
        a = /* @__PURE__ */ new Map();
        var f = [...d.current].filter(([c, v]) => {
          const h = this.current.get(c);
          return h ? h[0] !== v[0] || h[1] !== v[1] : !0;
        }).map(([c]) => c);
        if (f.length > 0)
          for (const c of o(jr, this)) (c.f & 155648) === 0 && Jr(c, f, a) && ((c.f & 4194320) !== 0 ? (H(c, ie), d.schedule(c)) : d.add_dirty_reaction(c, ie));
        if (o(tt, d).length > 0 && !o(Et, d)) {
          d.apply();
          for (var u of $(I, d, Zn).call(d)) $(I, d, Jn).call(d, u, [], []);
        }
        d.deactivate();
      }
    }
  }
}
function ar() {
  if (this.linked) {
    var e = this.prev, t = this.next;
    e === null ? rr = t : e.next = t, t === null ? ft = e : t.prev = e, this.linked = !1;
  }
}
function Zr(e) {
  var t = At, r = We;
  We = null, At = !0;
  try {
    var n;
    for (e && (Zr(), n = e()); ; ) {
      if (gs(), x === null) return n;
      x.flush();
    }
  } finally {
    At = t, We = r;
  }
}
function js() {
  if (0) {
    var e;
    for (const n of x.current.keys()) {
      var t;
      for (const [i, s] of (t = n.updated) !== null && t !== void 0 ? t : [])
        var r;
    }
  }
  try {
    fs();
  } catch (n) {
    Se(n, Or);
  }
}
var le = null;
function dn(e) {
  var t = e.length;
  if (t !== 0) {
    for (var r = 0; r < t; ) {
      var n = e[r++];
      if ((n.f & 24576) === 0 && yt(n) && (le = /* @__PURE__ */ new Set(), it(n), n.deps === null && n.first === null && n.nodes === null && n.teardown === null && n.ac === null && _i(n), (le == null ? void 0 : le.size) > 0)) {
        Ee.clear();
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
function ei(e, t, r, n) {
  if (!r.has(e) && (r.add(e), e.reactions !== null))
    for (const i of e.reactions) {
      const s = i.f;
      (s & 2) !== 0 ? ei(i, t, r, n) : (s & 4194320) !== 0 && (s & 2048) === 0 && Jr(i, t, n) && (H(i, ie), Qr(i));
    }
}
function Jr(e, t, r) {
  const n = r.get(e);
  if (n !== void 0) return n;
  if (e.deps !== null) for (const i of e.deps) {
    if (Pt.call(t, i)) return !0;
    if ((i.f & 2) !== 0 && Jr(i, t, r))
      return r.set(i, !0), !0;
  }
  return r.set(e, !1), !1;
}
function Qr(e) {
  x.schedule(e);
}
function ti(e, t) {
  if (!((e.f & 32) !== 0 && (e.f & 1024) !== 0)) {
    (e.f & 2048) !== 0 ? t.d.push(e) : (e.f & 4096) !== 0 && t.m.push(e), H(e, ce);
    for (var r = e.first; r !== null; )
      ti(r, t), r = r.next;
  }
}
function ri(e) {
  H(e, ce);
  for (var t = e.first; t !== null; )
    ri(t), t = t.next;
}
var lr = /* @__PURE__ */ new Set(), Ee = /* @__PURE__ */ new Map();
var ni = !1;
function rt(e, t) {
  var r = {
    f: 0,
    v: e,
    reactions: null,
    equals: Nn,
    rv: 0,
    wv: 0
  };
  return r;
}
// @__NO_SIDE_EFFECTS__
function Ie(e, t) {
  const r = rt(e, t);
  return Xs(r), r;
}
// @__NO_SIDE_EFFECTS__
function Ot(e, t = !1, r = !0) {
  const n = rt(e);
  if (t || (n.equals = Wn), gt && r && N !== null && N.l !== null) {
    var i, s;
    ((s = (i = N.l).s) !== null && s !== void 0 ? s : i.s = []).push(n);
  }
  return n;
}
function K(e, t, r = !1) {
  T !== null && (!pe || (T.f & 131072) !== 0) && Ft() && (T.f & 4325394) !== 0 && (ge === null || !ge.has(e)) && hs();
  let n = r ? vt(t) : t;
  return _t(e, n, nr);
}
var Ye = null, Pr = 0;
function _t(e, t, r = null) {
  if (!e.equals(t)) {
    Oe ? Ee.set(e, t) : Ee.has(e) || Ee.set(e, e.v);
    var n = at.ensure();
    if (n.capture(e, t), 0 && (tracing_mode_flag || S !== null))
      var i, s, a;
    if ((e.f & 2) !== 0) {
      const l = e;
      (e.f & 2048) !== 0 && Xr(l), B === null && Yr(l);
    }
    e.wv = $i(), Ye = null, Pr = 0, ii(e, ie, r), Ye = null, Ft() && S !== null && (S.f & 1024) !== 0 && (S.f & 96) === 0 && (oe === null ? Gs([e]) : oe.push(e)), !n.is_fork && lr.size > 0 && !ni && Ps();
  }
  return t;
}
function Ps() {
  ni = !1;
  for (const e of lr) {
    (e.f & 1024) !== 0 && H(e, je);
    let t;
    try {
      t = yt(e);
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
function ii(e, t, r) {
  var n = e.reactions;
  if (n !== null) {
    var i = Ft(), s = n.length;
    if (Pr += s, Pr > 1e5 && Ye === null && (Ye = /* @__PURE__ */ new Set()), Ye !== null) {
      if (Ye.has(e)) return;
      Ye.add(e);
    }
    for (var a = 0; a < s; a++) {
      var l = n[a], f = l.f;
      if (!(!i && l === S)) {
        var u = (f & ie) === 0;
        if (u && H(l, t), (f & 131072) !== 0) lr.add(l);
        else if ((f & 2) !== 0) {
          var d = l;
          B == null || B.delete(d), ii(d, je, r);
        } else if (u) {
          var c = l;
          (f & 16) !== 0 && le !== null && le.add(c), r !== null ? r.push(c) : Qr(c);
        }
      }
    }
  }
}
var Rs = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;
function vt(e) {
  if (typeof e != "object" || e === null || ht in e || Cn in e) return e;
  const t = Br(e);
  if (t !== Fi && t !== Di) return e;
  var r = /* @__PURE__ */ new Map(), n = Tn(e), i = /* @__PURE__ */ Ie(0), s = null, a = Je, l = (c) => {
    if (Je === a) return c();
    var v = T, h = Je;
    de(null), gn(a);
    var g = c();
    return de(v), gn(h), g;
  };
  n && r.set("length", /* @__PURE__ */ Ie(e.length, s));
  var f = "";
  let u = !1;
  function d(c) {
    if (!u) {
      u = !0, f = c, fn(i, `${f} version`);
      for (const [v, h] of r) fn(h, Cs(f, v));
      u = !1;
    }
  }
  return new Proxy(e, {
    defineProperty(c, v, h) {
      (!("value" in h) || h.configurable === !1 || h.enumerable === !1 || h.writable === !1) && ds();
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
          const g = l(() => /* @__PURE__ */ Ie(q, s));
          r.set(v, g), jt(i);
        }
      } else
        K(h, q), jt(i);
      return !0;
    },
    get(c, v, h) {
      var g;
      if (v === ht) return e;
      var _ = r.get(v), p = v in c;
      if (_ === void 0 && (!p || !((g = Ze(c, v)) === null || g === void 0) && g.writable) && (_ = l(() => {
        var R = vt(p ? c[v] : q), C = /* @__PURE__ */ Ie(R, s);
        return C;
      }), r.set(v, _)), _ !== void 0) {
        var m = k(_);
        return m === q ? void 0 : m;
      }
      return Reflect.get(c, v, h);
    },
    getOwnPropertyDescriptor(c, v) {
      var h;
      (h = this.has) === null || h === void 0 || h.call(this, c, v);
      var g = Reflect.getOwnPropertyDescriptor(c, v), _ = r.get(v);
      if (_ !== void 0) {
        var p = k(_);
        if (p === q) return;
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
      if (v === ht) return !0;
      var g = r.get(v), _ = g !== void 0 && g.v !== q || Reflect.has(c, v);
      return (g !== void 0 || (S !== null || T !== null) && (!_ || !((h = Ze(c, v)) === null || h === void 0) && h.writable)) && (g === void 0 && (g = l(() => {
        var p = _ ? vt(c[v]) : q, m = /* @__PURE__ */ Ie(p, s);
        return m;
      }), r.set(v, g)), k(g) === q) ? !1 : _;
    },
    set(c, v, h, g) {
      var _ = r.get(v), p = v in c;
      if (n && v === "length") for (var m = h; m < _.v; m += 1) {
        var R = r.get(m + "");
        R !== void 0 ? K(R, q) : m in c && (R = l(() => /* @__PURE__ */ Ie(q, s)), r.set(m + "", R));
      }
      if (_ === void 0) {
        var C;
        (!p || !((C = Ze(c, v)) === null || C === void 0) && C.writable) && (_ = l(() => /* @__PURE__ */ Ie(void 0, s)), K(_, vt(h)), r.set(v, _));
      } else {
        p = _.v !== q;
        var W = l(() => vt(h));
        K(_, W);
      }
      var G = Reflect.getOwnPropertyDescriptor(c, v);
      if (G != null && G.set && G.set.call(g, h), !p) {
        if (n && typeof v == "string") {
          var A = r.get("length"), U = Number(v);
          Number.isInteger(U) && U >= A.v && K(A, U + 1);
        }
        jt(i);
      }
      return !0;
    },
    ownKeys(c) {
      k(i);
      var v = Reflect.ownKeys(c).filter((_) => {
        var p = r.get(_);
        return p === void 0 || p.v !== q;
      });
      for (var [h, g] of r) g.v !== q && !(h in c) && v.push(h);
      return v;
    },
    setPrototypeOf() {
      vs();
    }
  });
}
function Cs(e, t) {
  var r;
  return typeof t == "symbol" ? `${e}[Symbol(${(r = t.description) !== null && r !== void 0 ? r : ""})]` : Rs.test(t) ? `${e}.${t}` : /^\d+$/.test(t) ? `${e}[${t}]` : `${e}['${t}']`;
}
var vn, Is, si, ai, li;
function Rr() {
  if (vn === void 0) {
    vn = window, Is = document, si = /Firefox/.test(navigator.userAgent);
    var e = Element.prototype, t = Node.prototype, r = Text.prototype;
    ai = Ze(t, "firstChild").get, li = Ze(t, "nextSibling").get, ln(e) && (e[Xi] = void 0, e[Mr] = null, e[Gi] = void 0, e.__e = void 0), ln(r) && (r[Xt] = void 0);
  }
}
function Fe(e = "") {
  return document.createTextNode(e);
}
// @__NO_SIDE_EFFECTS__
function nt(e) {
  return ai.call(e);
}
// @__NO_SIDE_EFFECTS__
function Pe(e) {
  return li.call(e);
}
function oi(e, t) {
  if (!z) return /* @__PURE__ */ nt(e);
  var r = /* @__PURE__ */ nt(F);
  if (r === null) r = F.appendChild(Fe());
  else if (t && r.nodeType !== 3) {
    var n = Fe();
    return r == null || r.before(n), fe(n), n;
  }
  return t && ui(r), fe(r), r;
}
function hn(e, t = !1) {
  if (!z) return /* @__PURE__ */ nt(e);
  var r = oi(e, t);
  return Tr(e), r;
}
function pn(e, t = 1, r = !1) {
  let n = z ? F : e;
  for (var i; t--; )
    i = n, n = /* @__PURE__ */ Pe(n);
  if (!z) return n;
  if (r) {
    if ((n == null ? void 0 : n.nodeType) !== 3) {
      var s = Fe();
      return n === null ? i == null || i.after(s) : n.before(s), fe(s), s;
    }
    ui(n);
  }
  return fe(n), n;
}
function fi(e) {
  e.textContent = "";
}
function Ls() {
  return !st || le !== null ? !1 : (S.f & qr) !== 0;
}
function en(e, t, r) {
  return t == null || t === "http://www.w3.org/1999/xhtml" ? r ? document.createElement(e, { is: r }) : document.createElement(e) : r ? document.createElementNS(t, e, { is: r }) : document.createElementNS(t, e);
}
function ui(e) {
  if (e.nodeValue.length < 65536) return;
  let t = e.nextSibling;
  for (; t !== null && t.nodeType === 3; )
    t.remove(), e.nodeValue += t.nodeValue, t = e.nextSibling;
}
function Ns(e) {
  var t = S;
  if (t === null)
    return T.f |= er, e;
  if ((t.f & 32768) === 0 && (t.f & 4) === 0)
    throw e;
  Se(e, t);
}
function Se(e, t) {
  if (e === He) throw e;
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
function ci(e) {
  S === null && (T === null && os(e), ls()), Oe && as(e);
}
function Ws(e, t) {
  var r = t.last;
  r === null ? t.last = t.first = e : (r.next = e, e.prev = r, t.last = e);
}
function ye(e, t) {
  var r = S;
  r !== null && (r.f & 8192) !== 0 && (e |= Ur);
  var n = {
    ctx: N,
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
  x == null || x.register_created_effect(n);
  var i = n;
  if ((e & 4) !== 0)
    Lt !== null ? Lt.push(n) : at.ensure().schedule(n);
  else if (t !== null) {
    try {
      it(n);
    } catch (l) {
      throw ue(n), l;
    }
    i.deps === null && i.teardown === null && i.nodes === null && i.first === i.last && (i.f & 524288) === 0 && (i = i.first, (e & 16) !== 0 && (e & 65536) !== 0 && i !== null && (i.f |= Pn));
  }
  if (i !== null && (i.parent = r, r !== null && Ws(i, r), T !== null && (T.f & 2) !== 0 && (e & 64) === 0)) {
    var s, a = T;
    ((s = a.effects) !== null && s !== void 0 ? s : a.effects = []).push(i);
  }
  return n;
}
function tn() {
  return T !== null && !pe;
}
function di(e) {
  const t = ye(8, null);
  return H(t, ce), t.teardown = e, t;
}
function Cr(e) {
  ci("$effect");
  var t = S.f;
  if (!T && (t & 32) !== 0 && N !== null && !N.i) {
    var r, n = N;
    ((r = n.e) !== null && r !== void 0 ? r : n.e = []).push(e);
  } else return vi(e);
}
function vi(e) {
  return ye(4 | Rn, e);
}
function zs(e) {
  return ci("$effect.pre"), ye(8 | Rn, e);
}
function Fs(e) {
  at.ensure();
  const t = ye(64 | mt, e);
  return () => {
    ue(t);
  };
}
function Ds(e) {
  at.ensure();
  const t = ye(64 | mt, e);
  return (r = {}) => new Promise((n) => {
    r.outro ? wt(t, () => {
      ue(t), n(void 0);
    }) : (ue(t), n(void 0));
  });
}
function Hs(e) {
  return ye(4, e);
}
function Bs(e, t) {
  var r = N, n = {
    effect: null,
    ran: !1,
    deps: e
  };
  r.l.$.push(n), n.effect = dr(() => {
    if (e(), !n.ran) {
      n.ran = !0;
      var i = S;
      try {
        ve(i.parent), xe(t);
      } finally {
        ve(i);
      }
    }
  });
}
function Us() {
  var e = N;
  dr(() => {
    for (var t of e.l.$) {
      t.deps();
      var r = t.effect;
      (r.f & 1024) !== 0 && r.deps !== null && H(r, je), yt(r) && it(r), t.ran = !1;
    }
  });
}
function qs(e) {
  return ye(Vi | mt, e);
}
function dr(e, t = 0) {
  return ye(8 | t, e);
}
function Vs(e, t = [], r = [], n = []) {
  ys(n, t, r, (i) => {
    ye(8, () => {
      e(...i.map(k));
    });
  });
}
function hi(e, t = 0) {
  var r = ye(16 | t, e);
  return r;
}
function Me(e) {
  return ye(32 | mt, e);
}
function pi(e) {
  var t = e.teardown;
  if (t !== null) {
    const r = Oe, n = T;
    _n(!0), de(null);
    try {
      t.call(null);
    } catch (i) {
      Se(i, e.parent);
    } finally {
      _n(r), de(n);
    }
  }
}
function rn(e, t = !1) {
  var r = e.first;
  for (e.first = e.last = null; r !== null; ) {
    const i = r.ac;
    i !== null && Dt(() => {
      i.abort(zt);
    });
    var n = r.next;
    (r.f & 64) !== 0 ? r.parent = null : ue(r, t), r = n;
  }
}
function Ys(e) {
  for (var t = e.first; t !== null; ) {
    var r = t.next;
    (t.f & 32) === 0 && ue(t), t = r;
  }
}
function ue(e, t = !0) {
  var r = !1;
  (t || (e.f & 262144) !== 0) && e.nodes !== null && e.nodes.end !== null && (Ks(e.nodes.start, e.nodes.end), r = !0), e.f |= Sr, rn(e, t && !r), Nt(e, 0);
  var n = e.nodes && e.nodes.t;
  if (n !== null) for (const s of n) s.stop();
  pi(e), e.f ^= Sr, e.f |= jn;
  var i = e.parent;
  i !== null && i.first !== null && _i(e), e.next = e.prev = e.teardown = e.ctx = e.deps = e.fn = e.nodes = e.ac = e.b = null;
}
function Ks(e, t) {
  for (; e !== null; ) {
    var r = e === t ? null : /* @__PURE__ */ Pe(e);
    e.remove(), e = r;
  }
}
function _i(e) {
  var t = e.parent, r = e.prev, n = e.next;
  r !== null && (r.next = n), n !== null && (n.prev = r), t !== null && (t.first === e && (t.first = n), t.last === e && (t.last = r));
}
function wt(e, t, r = !0) {
  var n = [];
  e.f |= 256, gi(e, n, !0);
  var i = () => {
    r && ue(e), t && t();
  }, s = n.length;
  if (s > 0) {
    var a = () => --s || i();
    for (var l of n) l.out(a);
  } else i();
}
function gi(e, t, r) {
  if ((e.f & 8192) === 0) {
    e.f ^= Ur;
    var n = e.nodes && e.nodes.t;
    if (n !== null)
      for (const l of n) (l.is_global || r) && t.push(l);
    for (var i = e.first; i !== null; ) {
      var s = i.next;
      if ((i.f & 64) === 0) {
        var a = (i.f & 65536) !== 0 || (i.f & 32) !== 0 && (e.f & 16) !== 0;
        gi(i, t, a ? r : !1);
      }
      i = s;
    }
  }
}
function mi(e) {
  e.f &= -257, wi(e, !0);
}
function wi(e, t) {
  if ((e.f & 256) === 0 && (e.f & 8192) !== 0) {
    e.f ^= Ur, (e.f & 1024) === 0 && (H(e, ie), at.ensure().schedule(e));
    for (var r = e.first; r !== null; ) {
      var n = r.next, i = (r.f & 65536) !== 0 || (r.f & 32) !== 0;
      wi(r, i ? t : !1), r = n;
    }
    var s = e.nodes && e.nodes.t;
    if (s !== null)
      for (const a of s) (a.is_global || t) && a.in();
  }
}
function yi(e, t) {
  if (e.nodes)
    for (var r = e.nodes.start, n = e.nodes.end; r !== null; ) {
      var i = r === n ? null : /* @__PURE__ */ Pe(r);
      t.append(r), r = i;
    }
}
var wr = null, Oe = !1;
function _n(e) {
  Oe = e;
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
function Xs(e) {
  if (T !== null && (!st && (T.f & 2097152) !== 0 || (T.f & 2) !== 0)) {
    var t;
    ((t = ge) !== null && t !== void 0 ? t : ge = /* @__PURE__ */ new Set()).add(e);
  }
}
var re = null, se = 0, oe = null;
function Gs(e) {
  oe = e;
}
var bi = 1, Ge = 0, Je = Ge;
function gn(e) {
  Je = e;
}
function $i() {
  return ++bi;
}
function yt(e) {
  var t = e.f;
  if ((t & 2048) !== 0) return !0;
  if ((t & 4096) !== 0) {
    for (var r = e.deps, n = r.length, i = 0; i < n; i++) {
      var s = r[i];
      if (yt(s) && qn(s), s.wv > e.wv) return !0;
    }
    (t & 512) !== 0 && B === null && H(e, ce);
  }
  return !1;
}
function xi(e, t, r = !0) {
  var n = e.reactions;
  if (n !== null && !(!st && ge !== null && ge.has(e)))
    for (var i = 0; i < n.length; i++) {
      var s = n[i];
      (s.f & 2) !== 0 ? xi(s, t, !1) : t === s && (r ? H(s, ie) : (s.f & 1024) !== 0 && H(s, je), Qr(s));
    }
}
function ki(e) {
  var t = re, r = se, n = oe, i = T, s = ge, a = N, l = pe, f = Je, u = e.f;
  re = null, se = 0, oe = null, T = (u & 96) === 0 ? e : null, ge = null, pt(e.ctx), pe = !1, Je = ++Ge, e.ac !== null && (Dt(() => {
    e.ac.abort(zt);
  }), e.ac = null);
  try {
    e.f |= on;
    var d = e.fn, c = d();
    e.f |= qr;
    var v = mn(e);
    if (Ft() && oe !== null && !pe && v !== null && (e.f & 6146) === 0) for (var h = 0; h < oe.length; h++) xi(oe[h], e);
    if (i !== null && i !== e) {
      if (Ge++, i.deps !== null) for (let g = 0; g < r; g += 1) i.deps[g].rv = Ge;
      if (t !== null) for (const g of t) g.rv = Ge;
      oe !== null && (n === null ? n = oe : n.push(...oe));
    }
    return (e.f & 8388608) !== 0 && (e.f ^= er), c;
  } catch (g) {
    return mn(e), Ns(g);
  } finally {
    e.f ^= on, re = t, se = r, oe = n, T = i, ge = s, pt(a), pe = l, Je = f;
  }
}
function mn(e) {
  var t = e.deps, r = x == null ? void 0 : x.is_fork;
  if (re !== null) {
    var n;
    if (r || Nt(e, se), t !== null && se > 0)
      for (t.length = se + re.length, n = 0; n < re.length; n++) t[se + n] = re[n];
    else e.deps = t = re;
    if (tn() && (e.f & 512) !== 0) for (n = se; n < t.length; n++) {
      var i, s;
      ((s = (i = t[n]).reactions) !== null && s !== void 0 ? s : i.reactions = []).push(e);
    }
  } else !r && t !== null && se < t.length && (Nt(e, se), t.length = se);
  return t;
}
function Zs(e, t) {
  let r = t.reactions;
  if (r !== null) {
    var n = zi.call(r, e);
    if (n !== -1) {
      var i = r.length - 1;
      i === 0 ? r = t.reactions = null : (r[n] = r[i], r.pop());
    }
  }
  if (r === null && (t.f & 2) !== 0 && (re === null || !Pt.call(re, t))) {
    var s = t;
    (s.f & 512) !== 0 && (s.f ^= 512), s.v !== q && Yr(s), s.ac !== null && Dt(() => {
      s.ac.abort(zt), s.ac = null, H(s, ie);
    }), Es(s), Nt(s, 0);
  }
}
function Nt(e, t) {
  var r = e.deps;
  if (r !== null)
    for (var n = t; n < r.length; n++) Zs(e, r[n]);
}
function it(e) {
  var t = e.f;
  if ((t & 16384) === 0) {
    H(e, ce);
    var r = S;
    if (S = e, 0)
      var n, i, s;
    try {
      (t & 16777232) !== 0 ? Ys(e) : rn(e), pi(e);
      var a = ki(e);
      if (e.teardown = typeof a == "function" ? a : null, e.wv = bi, 0)
        for (var l of e.deps) ;
    } finally {
      S = r;
    }
  }
}
function k(e) {
  var t = (e.f & 2) !== 0;
  if (wr == null || wr.add(e), T !== null && !pe && !(S !== null && (S.f & 16384) !== 0) && (ge === null || !ge.has(e))) {
    var r = T.deps;
    if ((T.f & 2097152) !== 0)
      e.rv < Ge && (e.rv = Ge, re === null && r !== null && r[se] === e ? se++ : re === null ? re = [e] : re.push(e));
    else {
      var n, i;
      (i = (n = T).deps) !== null && i !== void 0 || (n.deps = []), Pt.call(T.deps, e) || T.deps.push(e);
      var s = e.reactions;
      s === null ? e.reactions = [T] : Pt.call(s, T) || s.push(T);
    }
  }
  if (0) {
    if (!pe && reactivity_loss_tracker && x === null && We === null && !reactivity_loss_tracker.warned && (reactivity_loss_tracker.effect.f & 2097152) === 0 && !reactivity_loss_tracker.effect_deps.has(e))
      var a;
    if (tracing_mode_flag && !pe && tracing_expressions !== null && T !== null && tracing_expressions.reaction === T && !e.trace) {
      if (a)
        var l, f;
    }
  }
  if (Oe && Ee.has(e)) return Ee.get(e);
  if (t) {
    var u = e;
    if (Oe) {
      var d = u.v;
      return ((u.f & 1024) === 0 && u.reactions !== null || Si(u)) && (d = Xr(u)), Ee.set(u, d), d;
    }
    var c = (u.f & 512) === 0 && !pe && T !== null && (T.f & 512) !== 0, v = (u.f & qr) === 0;
    yt(u) && (c && (u.f |= 512), qn(u)), c && !v && (Vn(u), Ei(u));
  }
  if (B != null && B.has(e)) return B.get(e);
  if ((e.f & 8388608) !== 0) throw e.v;
  return e.v;
}
function Ei(e) {
  if (e.f |= 512, e.deps !== null)
    for (const r of e.deps) {
      var t = r.reactions;
      t === null ? r.reactions = [e] : Pt.call(t, e) || t.push(e), (r.f & 2) !== 0 && (r.f & 512) === 0 && (Vn(r), Ei(r));
    }
}
function Si(e) {
  if (e.v === q) return !0;
  if (e.deps === null) return !1;
  for (const t of e.deps)
    if (Ee.has(t) || (t.f & 2) !== 0 && Si(t)) return !0;
  return !1;
}
function xe(e) {
  var t = pe;
  try {
    return pe = !0, e();
  } finally {
    pe = t;
  }
}
function Mi(e) {
  if (!(typeof e != "object" || !e || e instanceof EventTarget)) {
    if (ht in e) Ir(e);
    else if (!Array.isArray(e)) for (let t in e) {
      const r = e[t];
      typeof r == "object" && r && ht in r && Ir(r);
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
    const r = Br(e);
    if (r !== Object.prototype && r !== Array.prototype && r !== Map.prototype && r !== Set.prototype && r !== Date.prototype) {
      const n = An(r);
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
var Ut = /* @__PURE__ */ Symbol("events"), Js = /* @__PURE__ */ new Set(), wn = /* @__PURE__ */ new Set();
function Qs(e, t, r, n = {}) {
  function i(s) {
    if (n.capture || Lr.call(t, s), !s.cancelBubble) return Dt(() => r == null ? void 0 : r.call(this, s));
  }
  return e.startsWith("pointer") || e.startsWith("touch") || e === "wheel" ? (i.__removed = !1, Ae(() => {
    i.__removed || t.addEventListener(e, i, n);
  })) : t.addEventListener(e, i, n), i;
}
function ea(e, t, r, n, i) {
  var s = {
    capture: n,
    passive: i
  }, a = Qs(e, t, r, s);
  (t === document.body || t === window || t === document || t instanceof HTMLMediaElement) && di(() => {
    a.__removed = !0, t.removeEventListener(e, a, s);
  });
}
var yr = null, br = !1;
function Lr(e) {
  var t, r = this, n = r.ownerDocument, i = e.type, s = ((t = e.composedPath) === null || t === void 0 ? void 0 : t.call(e)) || [], a = s[0] || e.target;
  yr = e, br || (br = !0, setTimeout(() => {
    br = !1, yr = null;
  }));
  var l = 0, f = yr === e && e[Ut];
  if (f) {
    var u = s.indexOf(f);
    if (u !== -1 && (r === document || r === window)) {
      e[Ut] = r;
      return;
    }
    var d = s.indexOf(r);
    if (d === -1) return;
    u <= d && (l = u);
  }
  if (a = s[l] || e.target, a !== r) {
    Rt(e, "currentTarget", {
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
          var _, p = (_ = a[Ut]) === null || _ === void 0 ? void 0 : _[i];
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
      e[Ut] = r, delete e.currentTarget, de(c), ve(v);
    }
  }
}
var ot, $r = ((ot = globalThis) === null || ot === void 0 || (ot = ot.window) === null || ot === void 0 ? void 0 : ot.trustedTypes) && /* @__PURE__ */ globalThis.window.trustedTypes.createPolicy("svelte-trusted-html", { createHTML: (e) => e });
function ta(e) {
  var t;
  return (t = $r == null ? void 0 : $r.createHTML(e)) !== null && t !== void 0 ? t : e;
}
function ra(e) {
  var t = en("template");
  return t.innerHTML = ta(e.replaceAll("<!>", "<!---->")), t.content;
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
function Ti(e, t) {
  var r = (t & 1) !== 0, n = (t & 2) !== 0, i, s = !e.startsWith("<!>");
  return () => {
    if (z)
      return Zt(F, null), F;
    i === void 0 && (i = ra(s ? e : "<!>" + e), r || (i = /* @__PURE__ */ nt(i)));
    var a = n || si ? document.importNode(i, !0) : i.cloneNode(!0);
    if (r) {
      var l = /* @__PURE__ */ nt(a), f = a.lastChild;
      Zt(l, f);
    } else Zt(a, a);
    return a;
  };
}
function Nr(e, t) {
  if (z) {
    var r = S;
    ((r.f & 32768) === 0 || r.nodes.end === null) && (r.nodes.end = F), Vr();
    return;
  }
  e !== null && e.before(t);
}
var na = [
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
], Ya = [
  ...na,
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
], ia = ["touchstart", "touchmove"];
function sa(e) {
  return ia.includes(e);
}
var aa = [
  "$state",
  "$state.raw",
  "$derived",
  "$derived.by"
], Ka = [
  ...aa,
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
function la(e) {
  let t = 0, r = rt(0), n;
  return () => {
    tn() && (k(r), dr(() => (t === 0 && (n = xe(() => e(() => jt(r)))), t += 1, () => {
      Ae(() => {
        t -= 1, t === 0 && (n == null || n(), n = void 0, jt(r));
      });
    })));
  };
}
var oa = Pn | mt;
function fa(e, t, r, n) {
  new ua(e, t, r, n);
}
var me = /* @__PURE__ */ new WeakMap(), Wr = /* @__PURE__ */ new WeakMap(), ke = /* @__PURE__ */ new WeakMap(), Wt = /* @__PURE__ */ new WeakMap(), ne = /* @__PURE__ */ new WeakMap(), we = /* @__PURE__ */ new WeakMap(), ae = /* @__PURE__ */ new WeakMap(), _e = /* @__PURE__ */ new WeakMap(), De = /* @__PURE__ */ new WeakMap(), ct = /* @__PURE__ */ new WeakMap(), Qe = /* @__PURE__ */ new WeakMap(), qt = /* @__PURE__ */ new WeakMap(), zr = /* @__PURE__ */ new WeakMap(), Ue = /* @__PURE__ */ new WeakMap(), yn = /* @__PURE__ */ new WeakMap(), L = /* @__PURE__ */ new WeakSet(), ua = class {
  constructor(e, t, r, n) {
    var i, s;
    Gr(this, L), P(this, "parent", void 0), P(this, "is_pending", !1), P(this, "transform_error", void 0), O(this, me, void 0), O(this, Wr, z ? F : null), O(this, ke, void 0), O(this, Wt, void 0), O(this, ne, void 0), O(this, we, null), O(this, ae, null), O(this, _e, null), O(this, De, null), O(this, ct, 0), O(this, Qe, 0), O(this, qt, !1), O(this, zr, /* @__PURE__ */ new Map()), O(this, Ue, null), O(this, yn, la(() => (E(Ue, this, rt(o(ct, this))), () => {
      E(Ue, this, null);
    }))), E(me, this, e), E(ke, this, t), E(Wt, this, (a) => {
      var l = S;
      l.b = this, l.f |= 128, r(a);
    }), this.parent = S.b, this.transform_error = (i = n != null ? n : (s = this.parent) === null || s === void 0 ? void 0 : s.transform_error) !== null && i !== void 0 ? i : ((a) => a), E(ne, this, hi(() => {
      if (z) {
        const a = Ln(o(Wr, this));
        Vr();
        const l = a === "[!";
        if (a.startsWith("[?")) {
          const f = JSON.parse(a.slice(2));
          $(L, this, da).call(this, f);
        } else l ? $(L, this, va).call(this) : $(L, this, ca).call(this);
      } else $(L, this, Oi).call(this);
    }, oa)), z && E(me, this, F);
  }
  defer_effect(e) {
    Bn(e, o(zr, this));
  }
  is_rendered() {
    return !this.is_pending && (!this.parent || this.parent.is_rendered());
  }
  has_pending_snippet() {
    return !!o(ke, this).pending;
  }
  update_pending_count(e, t) {
    $(L, this, ji).call(this, e, t), E(ct, this, o(ct, this) + e), !(!o(Ue, this) || o(qt, this)) && (E(qt, this, !0), Ae(() => {
      E(qt, this, !1), o(Ue, this) && _t(o(Ue, this), o(ct, this));
    }));
  }
  get_effect_pending() {
    return o(yn, this).call(this), k(o(Ue, this));
  }
  error(e) {
    if (e === He || !o(ke, this).onerror && !o(ke, this).failed) throw e;
    x != null && x.is_fork ? (o(we, this) && x.skip_effect(o(we, this)), o(ae, this) && x.skip_effect(o(ae, this)), o(_e, this) && x.skip_effect(o(_e, this)), x.oncommit(() => {
      $(L, this, et).call(this) || $(L, this, bn).call(this, e);
    })) : $(L, this, bn).call(this, e);
  }
};
function ca() {
  try {
    E(we, this, Me(() => o(Wt, this).call(this, o(me, this))));
  } catch (e) {
    this.error(e);
  }
}
function da(e) {
  const t = o(ke, this).failed, { reset: r, invoke_onerror: n } = $(L, this, Ai).call(this, e);
  Ae(n), t && E(_e, this, Me(() => {
    t(o(me, this), () => e, () => r);
  }));
}
function Ai(e) {
  var t = !1, r = !1;
  const n = () => {
    if (!$(L, this, et).call(this)) {
      if (t) {
        es();
        return;
      }
      t = !0, r && ps(), o(_e, this) !== null && wt(o(_e, this), () => {
        E(_e, this, null);
      }), $(L, this, nn).call(this, () => {
        $(L, this, Oi).call(this);
      });
    }
  };
  return {
    reset: n,
    invoke_onerror: () => {
      if (!$(L, this, et).call(this))
        try {
          var s, a;
          r = !0, (s = (a = o(ke, this)).onerror) === null || s === void 0 || s.call(a, e, n), r = !1;
        } catch (l) {
          Se(l, o(ne, this) && o(ne, this).parent);
        }
    }
  };
}
function et() {
  return (o(ne, this).f & (jn | Sr)) !== 0;
}
function va() {
  const e = o(ke, this).pending;
  e && (this.is_pending = !0, E(ae, this, Me(() => e(o(me, this)))), Ae(() => {
    if (!$(L, this, et).call(this)) {
      var t = E(De, this, document.createDocumentFragment()), r = Fe(), n = !1;
      if (t.append(r), E(we, this, $(L, this, nn).call(this, () => {
        try {
          return Me(() => o(Wt, this).call(this, r));
        } catch (i) {
          try {
            this.error(i), n = !0;
          } catch (s) {
            Se(s, o(ne, this).parent);
          }
          return null;
        }
      })), o(we, this) === null) {
        E(De, this, null), n && $(L, this, or).call(this, x);
        return;
      }
      o(Qe, this) === 0 && (o(me, this).before(t), E(De, this, null), wt(o(ae, this), () => {
        E(ae, this, null);
      }), $(L, this, or).call(this, x));
    }
  }));
}
function Oi() {
  try {
    if (this.is_pending = this.has_pending_snippet(), E(Qe, this, 0), E(ct, this, 0), E(we, this, Me(() => {
      o(Wt, this).call(this, o(me, this));
    })), o(Qe, this) > 0) {
      var e = E(De, this, document.createDocumentFragment());
      yi(o(we, this), e);
      const t = o(ke, this).pending;
      E(ae, this, Me(() => t(o(me, this))));
    } else $(L, this, or).call(this, x);
  } catch (t) {
    this.error(t);
  }
}
function or(e) {
  this.is_pending = !1, e.transfer_reactions(o(zr, this));
}
function nn(e) {
  var t = S, r = T, n = N;
  ve(o(ne, this)), de(o(ne, this)), pt(o(ne, this).ctx);
  try {
    return at.ensure(), e();
  } finally {
    ve(t), de(r), pt(n);
  }
}
function ji(e, t) {
  if (!this.has_pending_snippet()) {
    if (this.parent) {
      var r;
      $(L, r = this.parent, ji).call(r, e, t);
    }
    return;
  }
  E(Qe, this, o(Qe, this) + e), o(Qe, this) === 0 && ($(L, this, or).call(this, t), o(ae, this) && wt(o(ae, this), () => {
    E(ae, this, null);
  }), o(De, this) && (o(me, this).before(o(De, this)), E(De, this, null)));
}
function bn(e) {
  o(we, this) && (ue(o(we, this)), E(we, this, null)), o(ae, this) && (ue(o(ae, this)), E(ae, this, null)), o(_e, this) && (ue(o(_e, this)), E(_e, this, null)), z && (fe(o(Wr, this)), ts(), fe(Ar()));
  let t = o(ke, this).failed;
  const r = (n) => {
    if ($(L, this, et).call(this)) return;
    const { reset: i, invoke_onerror: s } = $(L, this, Ai).call(this, n);
    s(), t && !$(L, this, et).call(this) && E(_e, this, $(L, this, nn).call(this, () => {
      try {
        return Me(() => {
          var a = S;
          a.b = this, a.f |= 128, t(o(me, this), () => n, () => i);
        });
      } catch (a) {
        return Se(a, o(ne, this).parent), null;
      }
    }));
  };
  Ae(() => {
    if (!$(L, this, et).call(this)) {
      var n;
      try {
        n = this.transform_error(e);
      } catch (i) {
        Se(i, o(ne, this) && o(ne, this).parent);
        return;
      }
      n !== null && typeof n == "object" && typeof n.then == "function" ? n.then(r, (i) => Se(i, o(ne, this) && o(ne, this).parent)) : r(n);
    }
  });
}
var $n = !0;
function xn(e, t) {
  var r, n = t == null ? "" : typeof t == "object" ? `${t}` : t;
  n !== ((r = e[Xt]) !== null && r !== void 0 ? r : e[Xt] = e.nodeValue) && (e[Xt] = n, e.nodeValue = `${n}`);
}
function Pi(e, t) {
  return Ri(e, t);
}
function ha(e, t) {
  var r;
  Rr(), t.intro = (r = t.intro) !== null && r !== void 0 ? r : !1;
  const n = t.target, i = z, s = F;
  try {
    for (var a = /* @__PURE__ */ nt(n); a && (a.nodeType !== 8 || a.data !== "["); ) a = /* @__PURE__ */ Pe(a);
    if (!a) throw He;
    Ke(!0), fe(a);
    const l = Ri(e, te(te({}, t), {}, { anchor: a }));
    return Ke(!1), l;
  } catch (l) {
    if (l instanceof Error && l.message.split(`
`).some((f) => f.startsWith("https://svelte.dev/e/"))) throw l;
    return l !== He && console.warn("Failed to hydrate: ", l), t.recover === !1 && us(), Rr(), fi(n), Ke(!1), Pi(e, t);
  } finally {
    Ke(i), fe(s);
  }
}
var Vt = /* @__PURE__ */ new Map();
function Ri(e, { target: t, anchor: r, props: n = {}, events: i, context: s, intro: a = !0, transformError: l }) {
  Rr();
  var f = void 0, u = Ds(() => {
    var d = r != null ? r : t.appendChild(Fe());
    fa(d, { pending: () => {
    } }, (h) => {
      zn({});
      var g = N;
      if (s && (g.c = s), i && (n.$$events = i), z && Zt(h, null), $n = a, f = e(h, n) || Dn(), $n = !0, z && (S.nodes.end = F, F === null || F.nodeType !== 8 || F.data !== "]"))
        throw cr(), He;
      Fn();
    }, l);
    var c = /* @__PURE__ */ new Set(), v = (h) => {
      for (var g = 0; g < h.length; g++) {
        var _ = h[g];
        if (!c.has(_)) {
          c.add(_);
          var p = sa(_);
          for (const C of [t, document]) {
            var m = Vt.get(C);
            m === void 0 && (m = /* @__PURE__ */ new Map(), Vt.set(C, m));
            var R = m.get(_);
            R === void 0 ? (C.addEventListener(_, Lr, { passive: p }), m.set(_, 1)) : m.set(_, R + 1);
          }
        }
      }
    };
    return v(ur(Js)), wn.add(v), () => {
      for (var h of c) for (const m of [t, document]) {
        var g = Vt.get(m), _ = g.get(h);
        --_ == 0 ? (m.removeEventListener(h, Lr), g.delete(h), g.size === 0 && Vt.delete(m)) : g.set(h, _);
      }
      if (wn.delete(v), d !== r) {
        var p;
        (p = d.parentNode) === null || p === void 0 || p.removeChild(d);
      }
    };
  });
  return Fr.set(f, u), f;
}
var Fr = /* @__PURE__ */ new WeakMap();
function pa(e, t) {
  const r = Fr.get(e);
  return r ? (Fr.delete(e), r(t)) : Promise.resolve();
}
function _a(e) {
  N === null && ns("onMount"), gt && N.l !== null ? ga(N).m.push(e) : Cr(() => {
    const t = xe(e);
    if (typeof t == "function") return t;
  });
}
function ga(e) {
  var t, r = e.l;
  return (t = r.u) !== null && t !== void 0 ? t : r.u = {
    a: [],
    b: [],
    m: []
  };
}
function ma(e, t) {
  return t;
}
function wa(e, t, r) {
  for (var n = [], i = t.length, s, a = t.length, l = 0; l < i; l++) {
    let v = t[l];
    wt(v, () => {
      if (s) {
        if (s.pending.delete(v), s.done.add(v), s.pending.size === 0) {
          var h = e.outrogroups;
          Dr(e, ur(s.done)), h.delete(s), h.size === 0 && (e.outrogroups = null);
        }
      } else a -= 1;
    }, !1);
  }
  if (a === 0) {
    var f = n.length === 0 && r !== null && e.pending.size === 0;
    if (f) {
      var u = r, d = u.parentNode;
      fi(d), d.append(u), e.items.clear();
    }
    Dr(e, t, !f);
  } else {
    var c;
    s = {
      pending: new Set(t),
      done: /* @__PURE__ */ new Set()
    }, ((c = e.outrogroups) !== null && c !== void 0 ? c : e.outrogroups = /* @__PURE__ */ new Set()).add(s);
  }
}
function Dr(e, t, r = !0) {
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
      yi(s, a);
    } else ue(t[i], r);
  }
}
var Yt;
function ya(e, t, r, n, i, s = null) {
  var a = e, l = /* @__PURE__ */ new Map();
  if ((t & 4) !== 0) {
    var f = e;
    a = z ? fe(/* @__PURE__ */ nt(f)) : f.appendChild(Fe());
  }
  z && Vr();
  var u = null, d = /* @__PURE__ */ Kr(() => {
    var p = r();
    return Tn(p) ? p : p == null ? [] : ur(p);
  }), c = /* @__PURE__ */ new Map(), v = !0;
  function h(p) {
    if ((_.effect.f & 16384) === 0) {
      _.pending.delete(p);
      var m = k(d);
      _.fallback = u, ba(_, m, a, t, n), u !== null && (m.length === 0 ? (u.f & 33554432) === 0 ? mi(u) : (u.f ^= Tt, Mt(u, null, a)) : wt(u, () => {
        u = null;
      }));
    }
  }
  function g(p) {
    _.pending.delete(p);
  }
  var _ = {
    effect: hi(() => {
      var p = k(d), m = p.length;
      let R = !1;
      z && Ln(a) === "[!" != (m === 0) && (a = Ar(), fe(a), Ke(!1), R = !0);
      for (var C = /* @__PURE__ */ new Set(), W = x, G = Ls(), A = 0; A < m; A += 1) {
        z && F.nodeType === 8 && F.data === "]" && (a = F, R = !0, Ke(!1));
        var U = p[A], V = n(U, A);
        if (0)
          var lt;
        var X = v ? null : l.get(V);
        if (X)
          X.v && _t(X.v, U), X.i && _t(X.i, A), G && W.unskip_effect(X.e);
        else {
          var Te;
          X = $a(l, v ? a : (Te = Yt) !== null && Te !== void 0 ? Te : Yt = Fe(), U, V, A, i, t, r), v || (X.e.f |= Tt), l.set(V, X);
        }
        C.add(V);
      }
      if (m === 0 && s && !u && (v ? u = Me(() => s(a)) : (u = Me(() => {
        var he;
        return s((he = Yt) !== null && he !== void 0 ? he : Yt = Fe());
      }), u.f |= Tt)), m > C.size && ss("", "", ""), z && m > 0 && fe(Ar()), !v)
        if (c.set(W, C), G) {
          for (const [he, be] of l) C.has(he) || W.skip_effect(be.e);
          W.oncommit(h), W.ondiscard(g);
        } else h(W);
      R && Ke(!0), k(d);
    }),
    flags: t,
    items: l,
    pending: c,
    outrogroups: null,
    fallback: u
  };
  v = !1, z && (a = F);
}
function $t(e) {
  for (; e !== null && (e.f & 32) === 0; ) e = e.next;
  return e;
}
function ba(e, t, r, n, i) {
  var s = (n & 8) !== 0, a = t.length, l = e.items, f = $t(e.effect.first), u, d = null, c, v = [], h = [], g, _, p, m;
  if (s) {
    for (m = 0; m < a; m += 1)
      if (g = t[m], _ = i(g, m), p = l.get(_).e, (p.f & 33554432) === 0) {
        var R, C;
        (R = p.nodes) === null || R === void 0 || (R = R.a) === null || R === void 0 || R.measure(), ((C = c) !== null && C !== void 0 ? C : c = /* @__PURE__ */ new Set()).add(p);
      }
  }
  for (m = 0; m < a; m += 1) {
    if (g = t[m], _ = i(g, m), p = l.get(_).e, e.outrogroups !== null) for (const Z of e.outrogroups)
      Z.pending.delete(p), Z.done.delete(p);
    if ((p.f & 8192) !== 0 && (mi(p), s)) {
      var W, G;
      (W = p.nodes) === null || W === void 0 || (W = W.a) === null || W === void 0 || W.unfix(), ((G = c) !== null && G !== void 0 ? G : c = /* @__PURE__ */ new Set()).delete(p);
    }
    if ((p.f & 33554432) !== 0)
      if (p.f ^= Tt, p === f) Mt(p, null, r);
      else {
        var A = d ? d.next : f;
        p === e.effect.last && (e.effect.last = p.prev), p.prev && (p.prev.next = p.next), p.next && (p.next.prev = p.prev), Le(e, d, p), Le(e, p, A), Mt(p, A, r), d = p, v = [], h = [], f = $t(d.next);
        continue;
      }
    if (p !== f) {
      if (u !== void 0 && u.has(p)) {
        if (v.length < h.length) {
          var U = h[0], V;
          d = U.prev;
          var lt = v[0], X = v[v.length - 1];
          for (V = 0; V < v.length; V += 1) Mt(v[V], U, r);
          for (V = 0; V < h.length; V += 1) u.delete(h[V]);
          Le(e, lt.prev, X.next), Le(e, d, lt), Le(e, X, U), f = U, d = X, m -= 1, v = [], h = [];
        } else
          u.delete(p), Mt(p, f, r), Le(e, p.prev, p.next), Le(e, p, d === null ? e.effect.first : d.next), Le(e, d, p), d = p;
        continue;
      }
      for (v = [], h = []; f !== null && f !== p; ) {
        var Te;
        ((Te = u) !== null && Te !== void 0 ? Te : u = /* @__PURE__ */ new Set()).add(f), h.push(f), f = $t(f.next);
      }
      if (f === null) continue;
    }
    (p.f & 33554432) === 0 && v.push(p), d = p, f = $t(p.next);
  }
  if (e.outrogroups !== null) {
    for (const Z of e.outrogroups) if (Z.pending.size === 0) {
      var he;
      Dr(e, ur(Z.done)), (he = e.outrogroups) === null || he === void 0 || he.delete(Z);
    }
    e.outrogroups.size === 0 && (e.outrogroups = null);
  }
  if (f !== null || u !== void 0) {
    var be = [];
    if (u !== void 0)
      for (p of u) (p.f & 8192) === 0 && be.push(p);
    for (; f !== null; )
      (f.f & 8192) === 0 && f !== e.fallback && be.push(f), f = $t(f.next);
    var bt = be.length;
    if (bt > 0) {
      var vr = (n & 4) !== 0 && a === 0 ? r : null;
      if (s) {
        for (m = 0; m < bt; m += 1) {
          var Re;
          (Re = be[m].nodes) === null || Re === void 0 || (Re = Re.a) === null || Re === void 0 || Re.measure();
        }
        for (m = 0; m < bt; m += 1) {
          var Ce;
          (Ce = be[m].nodes) === null || Ce === void 0 || (Ce = Ce.a) === null || Ce === void 0 || Ce.fix();
        }
      }
      wa(e, be, vr);
    }
  }
  s && Ae(() => {
    if (c !== void 0)
      for (p of c) {
        var Z;
        (Z = p.nodes) === null || Z === void 0 || (Z = Z.a) === null || Z === void 0 || Z.apply();
      }
  });
}
function $a(e, t, r, n, i, s, a, l) {
  var f = (a & 1) !== 0 ? (a & 16) === 0 ? /* @__PURE__ */ Ot(r, !1, !1) : rt(r) : null, u = (a & 2) !== 0 ? rt(i) : null;
  return {
    v: f,
    i: u,
    e: Me(() => (s(t, f != null ? f : r, u != null ? u : i, l), () => {
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
function Le(e, t, r) {
  t === null ? e.effect.first = r : t.next = r, r === null ? e.effect.last = t : r.prev = t;
}
function xa(e, t) {
  Hs(() => {
    var r, n, i;
    e = (r = S == null || (n = S.parent) === null || n === void 0 || (n = n.nodes) === null || n === void 0 ? void 0 : n.start) !== null && r !== void 0 ? r : e;
    var s = e.getRootNode(), a = s.host ? s : (i = s.head) !== null && i !== void 0 ? i : s.ownerDocument.head;
    if (!a.querySelector("#" + t.hash)) {
      const l = en("style");
      l.id = t.hash, l.textContent = t.code, a.appendChild(l);
    }
  });
}
var ka = /* @__PURE__ */ Symbol("is custom element"), Ea = /* @__PURE__ */ Symbol("is html"), Sa = Zi ? "link" : "LINK";
function xr(e, t, r, n) {
  var i = Ma(e);
  if (z && (i[t] = e.getAttribute(t), t === "src" || t === "srcset" || t === "href" && e.nodeName === Sa)) {
    n || Aa(e, t, r != null ? r : "");
    return;
  }
  var s = i[t];
  s !== (i[t] = r) && (t === "loading" && (e[Yi] = r), r == null ? e.removeAttribute(t) : typeof r != "string" && Ta(e).has(t) ? e[t] = r : z && (typeof r == "number" || typeof r == "boolean") && s === String(r) || e.setAttribute(t, r));
}
function Ma(e) {
  var t;
  return (t = e[Mr]) !== null && t !== void 0 ? t : e[Mr] = {
    [ka]: e.nodeName.includes("-"),
    [Ea]: e.namespaceURI === Wi
  };
}
var kn = /* @__PURE__ */ new Map();
function Ta(e) {
  var t = e.getAttribute("is") || e.nodeName, r = kn.get(t);
  if (r) return r;
  kn.set(t, r = /* @__PURE__ */ new Set());
  for (var n, i = e, s = Element.prototype; s !== i; ) {
    n = An(i);
    for (var a in n) n[a].set && a !== "innerHTML" && a !== "textContent" && a !== "innerText" && r.add(a);
    i = Br(i);
  }
  return r;
}
function Aa(e, t, r) {
  var n;
}
function Hr(e, t) {
  return e === t ? !0 : new URL(e, document.baseURI).href === new URL(t, document.baseURI).href;
}
function En(e) {
  return e.split(",").map((t) => t.trim().split(" ").filter(Boolean));
}
function Oa(e, t) {
  var r = En(e.srcset), n = En(t);
  return n.length === r.length && n.every(([i, s], a) => s === r[a][1] && (Hr(r[a][0], i) || Hr(i, r[a][0])));
}
var Ci, dt = /* @__PURE__ */ new WeakMap(), fr = /* @__PURE__ */ new WeakMap(), kr = /* @__PURE__ */ new WeakMap(), Sn = /* @__PURE__ */ new WeakSet(), Ii = class {
  constructor(e) {
    Gr(this, Sn), O(this, dt, /* @__PURE__ */ new WeakMap()), O(this, fr, void 0), O(this, kr, void 0), E(kr, this, e);
  }
  observe(e, t) {
    var r = o(dt, this).get(e) || /* @__PURE__ */ new Set();
    return r.add(t), o(dt, this).set(e, r), $(Sn, this, ja).call(this).observe(e, o(kr, this)), () => {
      var n = o(dt, this).get(e);
      n.delete(t), n.size === 0 && (o(dt, this).delete(e), o(fr, this).unobserve(e));
    };
  }
};
Ci = Ii;
function ja() {
  var e;
  return (e = o(fr, this)) !== null && e !== void 0 ? e : E(fr, this, new ResizeObserver((t) => {
    for (var r of t) {
      Ci.entries.set(r.target, r);
      for (var n of o(dt, this).get(r.target) || []) n(r);
    }
  }));
}
P(Ii, "entries", /* @__PURE__ */ new WeakMap());
function Pa(e = !1) {
  const t = N, r = t.l.u;
  if (!r) return;
  let n = () => Mi(t.s);
  if (e) {
    let i = 0, s = {};
    const a = /* @__PURE__ */ It(() => {
      let l = !1;
      const f = t.s;
      for (const u in f) f[u] !== s[u] && (s[u] = f[u], l = !0);
      return l && i++, i;
    });
    n = () => k(a);
  }
  r.b.length && zs(() => {
    Mn(t, n), Er(r.b);
  }), Cr(() => {
    const i = xe(() => r.m.map(Bi));
    return () => {
      for (const s of i) typeof s == "function" && s();
    };
  }), r.a.length && Cr(() => {
    Mn(t, n), Er(r.a);
  });
}
function Mn(e, t) {
  if (e.l.s) for (const r of e.l.s) k(r);
  t();
}
var Kt = !1;
function Ra(e) {
  var t = Kt;
  try {
    return Kt = !1, [e(), Kt];
  } finally {
    Kt = t;
  }
}
function Ca(e, t, r, n) {
  var i = !gt || (r & 2) !== 0, s = (r & 8) !== 0, a = (r & 16) !== 0, l = n, f = !0, u = void 0, d = () => {
    if (a && i) {
      var A;
      return (A = u) !== null && A !== void 0 || (u = /* @__PURE__ */ It(n)), k(u);
    }
    return f && (f = !1, l = a ? xe(n) : n), l;
  };
  let c;
  if (s) {
    var v, h, g = ht in e || In in e;
    c = (v = (h = Ze(e, t)) === null || h === void 0 ? void 0 : h.set) !== null && v !== void 0 ? v : g && t in e ? (A) => e[t] = A : void 0;
  }
  var _, p = !1;
  s ? [_, p] = Ra(() => e[t]) : _ = e[t], _ === void 0 && n !== void 0 && (_ = d(), c && (i && cs(t), c(_)));
  var m;
  if (i ? m = () => {
    var A = e[t];
    return A === void 0 ? d() : (f = !0, A);
  } : m = () => {
    var A = e[t];
    return A !== void 0 && (l = void 0), A === void 0 ? l : A;
  }, i && (r & 4) === 0) return m;
  if (c) {
    var R = e.$$legacy;
    return (function(A, U) {
      return arguments.length > 0 ? ((!i || !U || R || p) && c(U ? m() : A), A) : m();
    });
  }
  var C = !1, W = ((r & 1) !== 0 ? It : Kr)(() => (C = !1, m()));
  s && k(W);
  var G = S;
  return (function(A, U) {
    if (arguments.length > 0) {
      const V = U ? k(W) : i && s ? vt(A) : A;
      return K(W, V), C = !0, l !== void 0 && (l = V), A;
    }
    return Oe && C || (G.f & 16384) !== 0 ? W.v : k(W);
  });
}
function Ia(e) {
  return new La(e);
}
var qe = /* @__PURE__ */ new WeakMap(), $e = /* @__PURE__ */ new WeakMap(), La = class {
  constructor(e) {
    var t, r;
    O(this, qe, void 0), O(this, $e, void 0);
    var n = /* @__PURE__ */ new Map(), i = (a, l) => {
      var f = /* @__PURE__ */ Ot(l, !1, !1);
      return n.set(a, f), f;
    };
    const s = new Proxy(te(te({}, e.props || {}), {}, { $$events: {} }), {
      get(a, l) {
        var f;
        return k((f = n.get(l)) !== null && f !== void 0 ? f : i(l, Reflect.get(a, l)));
      },
      has(a, l) {
        var f;
        return l === In ? !0 : (k((f = n.get(l)) !== null && f !== void 0 ? f : i(l, Reflect.get(a, l))), Reflect.has(a, l));
      },
      set(a, l, f) {
        var u;
        return K((u = n.get(l)) !== null && u !== void 0 ? u : i(l, f), f), Reflect.set(a, l, f);
      }
    });
    E($e, this, (e.hydrate ? ha : Pi)(e.component, {
      target: e.target,
      anchor: e.anchor,
      props: s,
      context: e.context,
      intro: (t = e.intro) !== null && t !== void 0 ? t : !1,
      recover: e.recover,
      transformError: e.transformError
    })), !st && (!(!(e == null || (r = e.props) === null || r === void 0) && r.$$host) || e.sync === !1) && Zr(), E(qe, this, s.$$events);
    for (const a of Object.keys(o($e, this)))
      a === "$set" || a === "$destroy" || a === "$on" || Rt(this, a, {
        get() {
          return o($e, this)[a];
        },
        set(l) {
          o($e, this)[a] = l;
        },
        enumerable: !0
      });
    o($e, this).$set = (a) => {
      Object.assign(s, a);
    }, o($e, this).$destroy = () => {
      pa(o($e, this));
    };
  }
  $set(e) {
    o($e, this).$set(e);
  }
  $on(e, t) {
    o(qe, this)[e] = o(qe, this)[e] || [];
    const r = (...n) => t.call(this, ...n);
    return o(qe, this)[e].push(r), () => {
      o(qe, this)[e] = o(qe, this)[e].filter((n) => n !== r);
    };
  }
  $destroy() {
    o($e, this).$destroy();
  }
}, Li;
typeof HTMLElement == "function" && (Li = class extends HTMLElement {
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
          const s = en("slot");
          n !== "default" && (s.name = n), Nr(i, s);
        };
      };
      if (await Promise.resolve(), !this.$$cn || this.$$c) return;
      const t = {}, r = Na(this);
      for (const n of this.$$s) n in r && (n === "default" && !this.$$d.children ? (this.$$d.children = e(n), t.default = !0) : t[n] = e(n));
      for (const n of this.attributes) {
        const i = this.$$g_p(n.name);
        i in this.$$d || (this.$$d[i] = Jt(i, n.value, this.$$p_d, "toProp"));
      }
      for (const n in this.$$p_d) !(n in this.$$d) && this[n] !== void 0 && (this.$$d[n] = this[n], delete this[n]);
      this.$$c = Ia({
        component: this.$$ctor,
        target: this.$$shadowRoot || this,
        props: te(te({}, this.$$d), {}, {
          $$slots: t,
          $$host: this
        })
      }), this.$$me = Fs(() => {
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
function Na(e) {
  const t = {};
  return e.childNodes.forEach((r) => {
    t[r.slot || "default"] = !0;
  }), t;
}
function Wa(e, t, r, n, i, s) {
  let a = class extends Li {
    constructor() {
      super(e, r, i), this.$$p_d = t;
    }
    static get observedAttributes() {
      return Qt(t).map((l) => (t[l].attribute || l).toLowerCase());
    }
  };
  return Qt(t).forEach((l) => {
    Rt(a.prototype, l, {
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
    Rt(a.prototype, l, { get() {
      var f;
      return (f = this.$$c) === null || f === void 0 ? void 0 : f[l];
    } });
  }), s && (a = s(a)), e.element = a, a;
}
var za = /* @__PURE__ */ Ti('<button type="button" class="svelte-19wflfl"><img width="45" height="45" loading="lazy" decoding="async" class="svelte-19wflfl"/> <span class="count svelte-19wflfl"> </span> <small class="svelte-19wflfl"> </small></button>'), Fa = /* @__PURE__ */ Ti('<div class="reaction svelte-19wflfl" aria-label="Emoji reactions"></div>'), Da = {
  hash: "svelte-19wflfl",
  code: `:host {display:block;}.reaction.svelte-19wflfl {display:flex;justify-content:center;align-items:flex-start;gap:14px;flex-wrap:wrap;margin:25px 0;text-align:center;}button.svelte-19wflfl {width:45px;height:45px;min-width:45px;border:0;background:none;cursor:pointer;position:relative;padding:0;}img.svelte-19wflfl {width:45px;height:45px;object-fit:contain;border-radius:50%;display:block;transform-origin:center;}img.active { animation: svelte-19wflfl-react 0.52s cubic-bezier(.2,.8,.2,1);}img.like { animation: svelte-19wflfl-spin 5.2s cubic-bezier(.2,.8,.2,1);}img.haha { animation: svelte-19wflfl-bounce .2s ease;}img.wow { animation: svelte-19wflfl-burst .8s ease;}img.sad { animation: svelte-19wflfl-sad 1.8s ease;}img.angry2 { animation: svelte-19wflfl-angry .8s ease;}.count.svelte-19wflfl {position:absolute;top:-8px;right:-10px;background:#ff4081;color:white;font:bold 12px/1 sans-serif;padding:4px 8px;border-radius:999px;min-width:22px;box-sizing:border-box;}small.svelte-19wflfl {display:block;margin-top:4px;color:#a1a1a1;font:11px sans-serif;user-select:none;white-space:nowrap;}.bubble {position:absolute;left:50%;bottom:calc(100% + 10px);transform:translateX(-50%);background:white;color:black;font:12px sans-serif;padding:6px 10px;border:2px solid black;border-radius:12px;white-space:nowrap;z-index:2; animation: svelte-19wflfl-bubble .6s ease;}\r
  @keyframes svelte-19wflfl-react { 50% { transform: scale(1.2); } }\r
  @keyframes svelte-19wflfl-spin { to { transform: rotate(1440deg) scale(1.15); } }\r
  @keyframes svelte-19wflfl-bounce { 50% { transform: scale(1.2,.8); } }\r
  @keyframes svelte-19wflfl-burst { 50% { transform: scale(1.3); filter: brightness(1.3); } }\r
  @keyframes svelte-19wflfl-sad { 50% { transform: scale(.88) translateY(12px) rotate(-8deg); } }\r
  @keyframes svelte-19wflfl-angry { 20%, 40%, 60% { transform: translateX(-6px) rotate(-6deg) scale(1.2); } }\r
  @keyframes svelte-19wflfl-bubble { from { opacity: 0; transform: translate(-50%, 8px) scale(.8); } }\r
  @media (prefers-reduced-motion: reduce) {.svelte-19wflfl, .svelte-19wflfl::before, .svelte-19wflfl::after {animation-duration:.01ms !important;} }`
};
function Ha(e, t) {
  zn(t, !1), xa(e, Da);
  let r = Ca(t, "pageId", 12, "");
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
  let u = /* @__PURE__ */ Ot(Object.fromEntries(i.map((y) => [y, 0]))), d = /* @__PURE__ */ Ot(""), c = null, v = null, h = null, g = null, _ = null, p = null, m = /* @__PURE__ */ Ot(null);
  const R = /* @__PURE__ */ new Set(), C = /* @__PURE__ */ new Set(), W = (y) => `emoji_${y || "global_0"}`.replace(/\W/g, "_"), G = (y) => {
    try {
      return JSON.parse(localStorage.getItem(l) || "{}")[y];
    } catch (w) {
      return console.warn("Could not read cached emoji counts.", w), null;
    }
  }, A = (y) => {
    try {
      const w = JSON.parse(localStorage.getItem(l) || "{}");
      w[y] = te({}, k(u));
      const b = Object.keys(w);
      b.slice(0, Math.max(0, b.length - 20)).forEach((M) => delete w[M]), localStorage.setItem(l, JSON.stringify(w));
    } catch (w) {
      console.warn("Could not save cached emoji counts.", w);
    }
  }, U = (y) => Object.fromEntries(i.map((w) => [w, typeof y[w] == "number" && Number.isFinite(y[w]) ? y[w] : 0]));
  async function V() {
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
  async function lt(y) {
    var w, b;
    if (!y || y === k(d)) return;
    K(d, y), _ == null || _();
    const M = await V();
    (w = h) !== null && w !== void 0 || (h = M.initializeApp({
      apiKey: "AIzaSyAwXK4q1t_0HVA-eZN22PIlKgJ3zYXIuAs",
      projectId: "emoji-reaction-fb044"
    }, "mikoroku-emoji-reaction"));
    const j = M.getFirestore(h), Y = M.getAuth(h), D = W(y), J = G(D);
    J && K(u, U(J)), g = M.doc(j, "emoji_reactions", D), M.enableIndexedDbPersistence(j).catch((Q) => console.warn("Emoji persistence unavailable.", Q)), (b = p) !== null && b !== void 0 || (p = M.onAuthStateChanged(Y, (Q) => {
      c = Q;
    })), _ = M.onSnapshot(g, (Q) => {
      const Be = U(Q.data());
      K(u, Object.fromEntries(i.map((ee) => [ee, C.has(ee) && k(u)[ee] > Be[ee] ? k(u)[ee] : Be[ee]]))), A(D);
    }, (Q) => console.warn("Emoji listener failed.", Q));
  }
  function X(y, w) {
    const b = document.createElement("span");
    b.className = "bubble", b.textContent = w, y.appendChild(b), setTimeout(() => b.remove(), 1900);
  }
  function Te(y, w) {
    if (document.documentElement.classList.contains("no-animations") || document.body.classList.contains("no-animations")) return;
    const b = y.querySelector("img");
    b && (b.classList.remove("active"), b.offsetWidth, b.classList.add("active", w), w === "like" && he(y, b), w === "haha" && be(y, b), w === "wow" && (b.classList.remove("active", w), bt(y)), w === "sad" && vr(y), w === "angry2" && (b.classList.remove("active", w), Re(y, b)));
  }
  function he(y, w) {
    const b = y.getBoundingClientRect();
    for (let M = 0; M < 14; M += 1) {
      const j = document.createElement("i"), Y = Math.random() * Math.PI * 2, D = 70 + Math.random() * 80;
      Object.assign(j.style, {
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
      }), document.body.appendChild(j), j.animate([{
        transform: "translate(0,0) scale(1)",
        opacity: 1
      }, {
        transform: `translate(${Math.cos(Y) * D}px,${Math.sin(Y) * D}px) scale(.5)`,
        opacity: 0
      }], {
        duration: 700,
        easing: "ease-out"
      }).finished.then(() => j.remove()).catch(() => j.remove());
    }
    w.animate([{ transform: "rotate(0deg) scale(1)" }, { transform: "rotate(1440deg) scale(1.15)" }], {
      duration: 5200,
      easing: "cubic-bezier(.2,.8,.2,1)",
      fill: "forwards"
    });
  }
  function be(y, w) {
    const b = y.getBoundingClientRect(), M = b.left + b.width / 2, j = b.top + b.height / 2, Y = [{
      x: 0,
      y: 0
    }];
    let D = M, J = j, Q = (Math.random() * 6 + 4) * (Math.random() > 0.5 ? 1 : -1), Be = (Math.random() * 6 + 4) * (Math.random() > 0.5 ? 1 : -1);
    for (let ee = 0; ee < 6; ee += 1)
      D += Q * 80, J += Be * 80, (D < 0 || D > innerWidth) && (Q *= -1), (J < 0 || J > innerHeight) && (Be *= -1), Y.push({
        x: Math.max(0, Math.min(innerWidth, D)) - M,
        y: Math.max(0, Math.min(innerHeight, J)) - j
      });
    Y.push({
      x: 0,
      y: 0
    }), w.animate(Y.map((ee) => ({ transform: `translate(${ee.x}px,${ee.y}px)` })), {
      duration: 3e3,
      easing: "cubic-bezier(.2,.8,.2,1)"
    });
  }
  function bt(y) {
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
      const j = document.createElement("i"), Y = 22 + Math.random() * 40;
      Object.assign(j.style, {
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
      }), b.appendChild(j);
      const D = Math.random() * 200 - 100, J = -250 - Math.random() * 200, Q = D * 1.1 + (Math.random() * 60 - 30), Be = 1400 + Math.random() * 400, ee = j.animate([{
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
        ee.cancel(), j.animate([{
          transform: `translate(${D}px,${J}px) scale(1.3,1)`,
          opacity: 0.9
        }, {
          transform: `translate(${Q}px,110vh) scale(.9,1.4)`,
          opacity: 0
        }], {
          duration: 4800,
          easing: "ease-in",
          fill: "forwards"
        }).finished.then(() => j.remove()).catch(() => j.remove());
      }, Be);
    }
  }
  function vr(y) {
    const w = y.getBoundingClientRect();
    for (let b = 0; b < 18; b += 1) {
      const M = document.createElement("i"), j = 5 + Math.random() * 7;
      Object.assign(M.style, {
        position: "fixed",
        left: `${w.left + w.width / 2 + Math.random() * 22 - 11}px`,
        top: `${w.top + 10}px`,
        width: `${j}px`,
        height: `${j * 1.8}px`,
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
  function Re(y, w) {
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
  async function Ce(y, w) {
    const b = `${k(d)}_${y}`;
    if (R.has(b)) return;
    R.add(b);
    const M = `reacted_${k(d)}_${y}`;
    try {
      var j, Y;
      const D = (c == null ? void 0 : c.uid) === f;
      if (!D && localStorage.getItem(M)) {
        X(w, "Already selected!");
        return;
      }
      if (!g || !v) throw new Error("Emoji reaction page is not ready.");
      K(u, te(te({}, k(u)), {}, { [y]: k(u)[y] + 1 })), C.add(y), Te(w, y), (j = (Y = navigator).vibrate) === null || j === void 0 || j.call(Y, 30), D || localStorage.setItem(M, "1"), await v.setDoc(g, { [y]: v.increment(1) }, { merge: !0 }), A(W(k(d))), setTimeout(() => C.delete(y), 1500);
    } catch (D) {
      K(u, te(te({}, k(u)), {}, { [y]: Math.max(0, k(u)[y] - 1) })), D instanceof Error && console.error("Failed to save emoji reaction.", D), X(w, "Failed to save. Try again.");
      try {
        localStorage.removeItem(M);
      } catch (J) {
        console.warn("Could not clear emoji vote lock.", J);
      }
    } finally {
      R.delete(b);
    }
  }
  _a(() => (K(m, lt(r()).catch((y) => console.error("Failed to initialize emoji reaction.", y)).finally(() => {
    K(m, null);
  })), () => {
    _ == null || _(), p == null || p(), _ = null, p = null;
  })), Bs(() => (Mi(r()), k(d), k(m)), () => {
    r() && r() !== k(d) && !k(m) && K(m, lt(r()).finally(() => {
      K(m, null);
    }));
  }), Us();
  var Z = {
    get pageId() {
      return r();
    },
    set pageId(y) {
      r(y), Zr();
    }
  };
  Pa();
  var hr = Fa();
  return ya(hr, 5, () => i, ma, (y, w) => {
    var b = za(), M = oi(b), j = pn(M, 2), Y = hn(j, !0), D = pn(j, 2), J = hn(D, !0);
    Tr(b), Vs(() => {
      xr(b, "aria-label", (k(w), xe(() => a[k(w)]))), xr(M, "src", (k(w), xe(() => s[k(w)]))), xr(M, "alt", (k(w), xe(() => a[k(w)]))), xn(Y, (k(u), k(w), xe(() => k(u)[k(w)]))), xn(J, (k(w), xe(() => a[k(w)])));
    }), ea("click", b, (Q) => Ce(k(w), Q.currentTarget)), Nr(y, b);
  }), Tr(hr), Nr(e, hr), Fn(Z);
}
customElements.define("mikoroku-emoji-reaction", Wa(Ha, { pageId: {} }, [], [], { mode: "open" }));
export {
  Ha as default
};
