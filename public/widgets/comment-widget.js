if (typeof window != "undefined") {
  var mn, Dt, gn, Ht;
  ((Dt = (mn = (Ht = (gn = window).__svelte) !== null && Ht !== void 0 ? Ht : gn.__svelte = {}).v) !== null && Dt !== void 0 ? Dt : mn.v = /* @__PURE__ */ new Set()).add("5");
}
var Ye = !1, Ge = !1;
function Wr() {
  Ge = !0;
}
Wr();
var me = {}, L = /* @__PURE__ */ Symbol("uninitialized");
var Fr = "http://www.w3.org/2000/svg", Dr = "http://www.w3.org/1998/Math/MathML", Hr = Array.isArray, Ur = Array.prototype.indexOf, it = Array.prototype.includes, qr = Array.from, xt = Object.keys, st = Object.defineProperty, Te = Object.getOwnPropertyDescriptor, Vr = Object.getOwnPropertyDescriptors, Yr = Object.prototype, Gr = Array.prototype, Rn = Object.getPrototypeOf, wn = Object.isExtensible, Kr = () => {
};
function Xr(e) {
  return e();
}
function Xt(e) {
  for (var t = 0; t < e.length; t++) e[t]();
}
function Nn() {
  var e, t;
  return {
    promise: new Promise((n, r) => {
      e = n, t = r;
    }),
    resolve: e,
    reject: t
  };
}
function at(e) {
  "@babel/helpers - typeof";
  return at = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
    return typeof t;
  } : function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, at(e);
}
function Zr(e, t) {
  if (at(e) != "object" || !e) return e;
  var n = e[Symbol.toPrimitive];
  if (n !== void 0) {
    var r = n.call(e, t || "default");
    if (at(r) != "object") return r;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
function Jr(e) {
  var t = Zr(e, "string");
  return at(t) == "symbol" ? t : t + "";
}
function T(e, t, n) {
  return (t = Jr(t)) in e ? Object.defineProperty(e, t, {
    value: n,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : e[t] = n, e;
}
var Ut, Ns = 1 << 24, Y = 1024, U = 2048, fe = 4096, Bn = 8192, zn = 16384, Wn = 32768, Zt = 1 << 25, Fn = 65536, Bs = 1 << 17, zs = 1 << 18, Ke = 1 << 19, Dn = 1 << 20, yn = 1 << 21, Qr = 1 << 22, St = 1 << 23, He = /* @__PURE__ */ Symbol("$state"), Hn = /* @__PURE__ */ Symbol("component"), Un = /* @__PURE__ */ Symbol("legacy props"), ei = /* @__PURE__ */ Symbol("proxy path"), ti = /* @__PURE__ */ Symbol("attributes"), ni = /* @__PURE__ */ Symbol("class"), ri = /* @__PURE__ */ Symbol("style"), ii = /* @__PURE__ */ Symbol("text"), ft = new class extends Error {
  constructor(...t) {
    super(...t), T(this, "name", "StaleReactionError"), T(this, "message", "The reaction that called `getAbortSignal()` was re-run or destroyed");
  }
}(), Fs = !!(!((Ut = globalThis.document) === null || Ut === void 0) && Ut.contentType) && /* @__PURE__ */ globalThis.document.contentType.includes("xml");
function si() {
  console.warn("https://svelte.dev/e/derived_inert");
}
function Nt(e) {
  console.warn("https://svelte.dev/e/hydration_mismatch");
}
function ai() {
  console.warn("https://svelte.dev/e/svelte_boundary_reset_noop");
}
var z = !1;
function pt(e) {
  z = e;
}
var O;
function ge(e) {
  if (e === null)
    throw Nt(), me;
  return O = e;
}
function Et() {
  return ge(/* @__PURE__ */ we(O));
}
function oi(e = 1) {
  if (z) {
    for (var t = e, n = O; t--; ) n = /* @__PURE__ */ we(n);
    O = n;
  }
}
function li(e = !0) {
  for (var t = 0, n = O; ; ) {
    if (n.nodeType === 8) {
      var r = n.data;
      if (r === "]") {
        if (t === 0) return n;
        t -= 1;
      } else (r === "[" || r === "[!" || r[0] === "[" && !isNaN(Number(r.slice(1)))) && (t += 1);
    }
    var i = /* @__PURE__ */ we(n);
    e && n.remove(), n = i;
  }
}
function ui(e) {
  if (!e || e.nodeType !== 8)
    throw Nt(), me;
  return e.data;
}
function qn(e) {
  return e === this.v;
}
function ci(e, t) {
  return e != e ? t == t : e !== t || e !== null && typeof e == "object" || typeof e == "function";
}
function Vn(e) {
  return !ci(e, this.v);
}
function fi(e) {
  throw new Error("https://svelte.dev/e/lifecycle_outside_component");
}
function di() {
  throw new Error("https://svelte.dev/e/async_derived_orphan");
}
function vi(e) {
  throw new Error("https://svelte.dev/e/effect_in_teardown");
}
function hi() {
  throw new Error("https://svelte.dev/e/effect_in_unowned_derived");
}
function pi(e) {
  throw new Error("https://svelte.dev/e/effect_orphan");
}
function _i() {
  throw new Error("https://svelte.dev/e/effect_update_depth_exceeded");
}
function mi() {
  throw new Error("https://svelte.dev/e/hydration_failed");
}
function gi(e) {
  throw new Error("https://svelte.dev/e/props_invalid_value");
}
function wi() {
  throw new Error("https://svelte.dev/e/state_descriptors_fixed");
}
function yi() {
  throw new Error("https://svelte.dev/e/state_prototype_fixed");
}
function bi() {
  throw new Error("https://svelte.dev/e/state_unsafe_mutation");
}
function ki() {
  throw new Error("https://svelte.dev/e/svelte_boundary_reset_onerror");
}
function bn(e, t) {
  return e.label = t, $i(e.v, t), e;
}
function $i(e, t) {
  var n;
  return e == null || (n = e[ei]) === null || n === void 0 || n.call(e, t), e;
}
function kn(e, t) {
  var n = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    t && (r = r.filter(function(i) {
      return Object.getOwnPropertyDescriptor(e, i).enumerable;
    })), n.push.apply(n, r);
  }
  return n;
}
function qe(e) {
  for (var t = 1; t < arguments.length; t++) {
    var n = arguments[t] != null ? arguments[t] : {};
    t % 2 ? kn(Object(n), !0).forEach(function(r) {
      T(e, r, n[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : kn(Object(n)).forEach(function(r) {
      Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(n, r));
    });
  }
  return e;
}
var j = null;
function Ve(e) {
  j = e;
}
function Yn(e, t = !1, n) {
  j = {
    p: j,
    i: !1,
    c: null,
    e: null,
    s: e,
    x: null,
    r: b,
    l: Ge && !t ? {
      s: null,
      u: null,
      $: []
    } : null
  };
}
function Gn(e) {
  var t = j, n = t.e;
  if (n !== null) {
    t.e = null;
    for (var r of n) wr(r);
  }
  if (e !== void 0 && (t.x = e), t.i = !0, j = t.p, 0)
    var i;
  return Kn(e);
}
function Kn(e = {}) {
  return st(e, Hn, { value: !0 }), e;
}
function dt() {
  return !Ge || j !== null && j.l === null;
}
var Ee = [];
function Xn() {
  var e = Ee;
  Ee = [], Xt(e);
}
function je(e) {
  if (Ee.length === 0 && !nt) {
    var t = Ee;
    queueMicrotask(() => {
      t === Ee && Xn();
    });
  }
  Ee.push(e);
}
function xi() {
  for (; Ee.length > 0; ) Xn();
}
var Si = ~(U | fe | Y);
function I(e, t) {
  e.f = e.f & Si | t;
}
function ln(e) {
  (e.f & 512) !== 0 || e.deps === null ? I(e, Y) : I(e, fe);
}
function Zn(e, t) {
  (e.f & 2048) !== 0 ? t.set(e, U) : (e.f & 4096) !== 0 && t.get(e) !== 2048 && t.set(e, fe), I(e, Y);
}
function Bt(e) {
  var t = k, n = b;
  G(null), K(null);
  try {
    return e();
  } finally {
    G(t), K(n);
  }
}
function Ei(e, t) {
  this.v = e, this.k = t;
}
function _t(e) {
  var t, n;
  function r(s, o) {
    try {
      var a = e[s](o), u = a.value, h = u instanceof Ei;
      Promise.resolve(h ? u.v : u).then(function(v) {
        if (h) {
          var c = s === "return" ? "return" : "next";
          if (!u.k || v.done) return r(c, v);
          v = e[c](v).value;
        }
        i(a.done ? "return" : "normal", v);
      }, function(v) {
        r("throw", v);
      });
    } catch (v) {
      i("throw", v);
    }
  }
  function i(s, o) {
    switch (s) {
      case "return":
        t.resolve({
          value: o,
          done: !0
        });
        break;
      case "throw":
        t.reject(o);
        break;
      default:
        t.resolve({
          value: o,
          done: !1
        });
    }
    (t = t.next) ? r(t.key, t.arg) : n = null;
  }
  this._invoke = function(s, o) {
    return new Promise(function(a, u) {
      var h = {
        key: s,
        arg: o,
        resolve: a,
        reject: u,
        next: null
      };
      n ? n = n.next = h : (t = n = h, r(s, o));
    });
  }, typeof e.return != "function" && (this.return = void 0);
}
_t.prototype[typeof Symbol == "function" && Symbol.asyncIterator || "@@asyncIterator"] = function() {
  return this;
}, _t.prototype.next = function(e) {
  return this._invoke("next", e);
}, _t.prototype.throw = function(e) {
  return this._invoke("throw", e);
}, _t.prototype.return = function(e) {
  return this._invoke("return", e);
};
function Mi(e, t, n, r) {
  const i = dt() ? ot : Qn;
  var s = e.filter((d) => !d.settled), o = t.map(i);
  if (n.length === 0 && s.length === 0) {
    r(o);
    return;
  }
  var a = b, u = Ti(), h = s.length === 1 ? s[0].promise : s.length > 1 ? Promise.all(s.map((d) => d.promise)) : null;
  function v(d) {
    if ((a.f & 16384) === 0) {
      u();
      try {
        r([...o, ...d]);
      } catch (_) {
        le(_, a);
      }
      Mt();
    }
  }
  var c = Jn();
  if (n.length === 0) {
    h.then(() => v([])).finally(c);
    return;
  }
  function f() {
    Promise.all(n.map((d) => /* @__PURE__ */ Ai(d))).then(v).catch((d) => le(d, a)).finally(c);
  }
  h ? h.then(() => {
    if ((a.f & 16384) !== 0) {
      c();
      return;
    }
    u(), f(), Mt();
  }) : f();
}
function Ti() {
  var e = b, t = k, n = j, r = w;
  if (0) var i;
  return function(o = !0) {
    K(e), G(t), Ve(n), o && (e.f & 16384) === 0 && (r == null || r.activate(), r == null || r.apply());
  };
}
var Ci = !1;
function Mt(e = !0) {
  Ci = !1, K(null), G(null), Ve(null), e && (w == null || w.deactivate());
}
function Jn() {
  var e = b, t = e.b, n = w, r = !!(t != null && t.is_rendered());
  return t == null || t.update_pending_count(1, n), n.increment(r, e), () => {
    t == null || t.update_pending_count(-1, n), n.decrement(r, e);
  };
}
// @__NO_SIDE_EFFECTS__
function ot(e) {
  var t = 2 | U;
  return b !== null && (b.f |= Ke), {
    ctx: j,
    deps: null,
    effects: null,
    equals: qn,
    f: t,
    fn: e,
    reactions: null,
    rv: 0,
    v: L,
    wv: 0,
    parent: b,
    ac: null
  };
}
var Je = /* @__PURE__ */ Symbol("obsolete");
// @__NO_SIDE_EFFECTS__
function Ai(e, t, n) {
  let r = b;
  r === null && di();
  var i = void 0, s = vt(L), o = !k, a = /* @__PURE__ */ new Set();
  return ts(() => {
    var u = b, h = Nn();
    i = h.promise;
    try {
      Promise.resolve(e()).then(h.resolve, (p) => {
        p !== ft && h.reject(p);
      }).finally(Mt);
    } catch (p) {
      h.reject(p), Mt();
    }
    var v = w;
    if (o) {
      var c;
      if ((u.f & 32768) !== 0) var f = Jn();
      if (!((c = r.b) === null || c === void 0) && c.is_rendered()) {
        var d;
        (d = v.async_deriveds.get(u)) === null || d === void 0 || d.reject(Je);
      } else for (const p of a.values()) p.reject(Je);
      a.add(h), v.async_deriveds.set(u, h);
    }
    const _ = (p, $ = void 0) => {
      f == null || f(), a.delete(h), $ !== Je && (v.activate(), $ ? (s.f |= St, It(s, $)) : ((s.f & 8388608) !== 0 && (s.f ^= St), It(s, p)), v.deactivate());
    };
    h.promise.then(_, (p) => _(null, p || "unknown"));
  }), Ki(() => {
    for (const u of a) u.reject(Je);
  }), new Promise((u) => {
    function h(v) {
      function c() {
        v === i ? u(s) : h(i);
      }
      v.then(c, c);
    }
    h(i);
  });
}
// @__NO_SIDE_EFFECTS__
function Qn(e) {
  const t = /* @__PURE__ */ ot(e);
  return t.equals = Vn, t;
}
function Oi(e) {
  var t = e.effects;
  if (t !== null) {
    e.effects = null;
    for (var n = 0; n < t.length; n += 1) ee(t[n]);
  }
}
function un(e) {
  var t, n = b, r = e.parent;
  if (!ce && r !== null && e.v !== L && (r.f & 24576) !== 0)
    return si(), e.v;
  K(r);
  try {
    Oi(e), t = Mr(e);
  } finally {
    K(n);
  }
  return t;
}
function er(e) {
  var t = un(e);
  if (!e.equals(t) && (e.wv = Sr(), (!(w != null && w.is_fork) || e.deps === null) && (w !== null ? (w.capture(e, t, !0), he == null || he.capture(e, t, !0)) : e.v = t, e.deps === null))) {
    I(e, Y);
    return;
  }
  ce || (P !== null ? (hn() || w != null && w.is_fork) && P.set(e, t) : ln(e));
}
function ji(e) {
  if (e.effects !== null) {
    for (const n of e.effects) if (n.teardown || n.ac) {
      var t;
      (t = n.teardown) === null || t === void 0 || t.call(n), n.ac !== null && Bt(() => {
        n.ac.abort(ft), n.ac = null;
      }), n.fn !== null && (n.teardown = Kr), ut(n, 0), pn(n);
    }
  }
}
function tr(e) {
  if (e.effects !== null)
    for (const t of e.effects) t.teardown && t.fn !== null && Le(t);
}
function nr(e, t) {
  if (t.has(e)) throw new TypeError("Cannot initialize the same private elements twice on an object");
}
function cn(e, t) {
  nr(e, t), t.add(e);
}
function M(e, t, n) {
  nr(e, t), t.set(e, n);
}
function g(e, t, n) {
  if (typeof e == "function" ? e === t : e.has(t)) return arguments.length < 3 ? t : n;
  throw new TypeError("Private element is not present on this object");
}
function l(e, t) {
  return e.get(g(e, t));
}
function y(e, t, n) {
  return e.set(g(e, t), n), n;
}
var rr, Tt = null, Be = null, w = null, he = null, P = null, Jt = null, nt = !1, qt = !1, lt = null, Ct = null, ir = 0;
var Pi = 1, At = /* @__PURE__ */ new WeakMap(), mt = /* @__PURE__ */ new WeakMap(), ze = /* @__PURE__ */ new WeakMap(), $e = /* @__PURE__ */ new WeakMap(), Qe = /* @__PURE__ */ new WeakMap(), Pe = /* @__PURE__ */ new WeakMap(), Qt = /* @__PURE__ */ new WeakMap(), pe = /* @__PURE__ */ new WeakMap(), ve = /* @__PURE__ */ new WeakMap(), kt = /* @__PURE__ */ new WeakMap(), et = /* @__PURE__ */ new WeakMap(), C = /* @__PURE__ */ new WeakSet(), Xe = class sr {
  constructor() {
    cn(this, C), T(this, "id", Pi++), T(this, "started", !1), T(this, "linked", !0), T(this, "prev", null), T(this, "next", null), T(this, "async_deriveds", /* @__PURE__ */ new Map()), T(this, "current", /* @__PURE__ */ new Map()), T(this, "previous", /* @__PURE__ */ new Map()), M(this, At, /* @__PURE__ */ new Set()), M(this, mt, /* @__PURE__ */ new Set()), M(this, ze, 0), M(this, $e, /* @__PURE__ */ new Map()), M(this, Qe, null), M(this, Pe, []), M(this, Qt, []), M(this, pe, /* @__PURE__ */ new Map()), M(this, ve, /* @__PURE__ */ new Map()), M(this, kt, /* @__PURE__ */ new Set()), T(this, "is_fork", !1), M(this, et, !1), Be === null ? Tt = Be = this : (Be.next = this, this.prev = Be), Be = this;
  }
  skip_effect(t) {
    l(ve, this).has(t) || l(ve, this).set(t, {
      d: [],
      m: []
    }), l(kt, this).delete(t);
  }
  unskip_effect(t, n = (r) => this.schedule(r)) {
    var r = l(ve, this).get(t);
    if (r) {
      l(ve, this).delete(t);
      for (var i of r.d)
        I(i, U), n(i);
      for (i of r.m)
        I(i, fe), n(i);
    }
    l(kt, this).add(t);
  }
  capture(t, n, r = !1) {
    t.v !== L && !this.previous.has(t) && this.previous.set(t, t.v), (t.f & 8388608) === 0 && (this.current.set(t, [n, r]), P == null || P.set(t, n)), this.is_fork || (t.v = n);
  }
  activate() {
    w = this;
  }
  deactivate() {
    w = null, P = null;
  }
  flush() {
    try {
      qt = !0, w = this, g(C, this, Ot).call(this);
    } finally {
      ir = 0, Jt = null, lt = null, Ct = null, qt = !1, w = null, P = null, oe.clear();
    }
  }
  discard() {
    var t;
    for (const n of l(mt, this)) n(this);
    l(mt, this).clear();
    for (const n of this.async_deriveds.values()) n.reject(Je);
    g(C, this, jt).call(this), (t = l(Qe, this)) === null || t === void 0 || t.resolve();
  }
  register_created_effect(t) {
    l(Qt, this).push(t);
  }
  increment(t, n) {
    if (y(ze, this, l(ze, this) + 1), t) {
      var r;
      let i = (r = l($e, this).get(n)) !== null && r !== void 0 ? r : 0;
      l($e, this).set(n, i + 1);
    }
  }
  decrement(t, n) {
    if (y(ze, this, l(ze, this) - 1), t) {
      var r;
      let i = (r = l($e, this).get(n)) !== null && r !== void 0 ? r : 0;
      i === 1 ? l($e, this).delete(n) : l($e, this).set(n, i - 1);
    }
    l(et, this) || (y(et, this, !0), je(() => {
      y(et, this, !1), this.linked && this.flush();
    }));
  }
  transfer_reactions(t) {
    for (const [n, r] of t) this.add_dirty_reaction(n, r);
    t.clear();
  }
  add_dirty_reaction(t, n) {
    (n === 2048 || l(pe, this).get(t) !== 2048) && l(pe, this).set(t, n);
  }
  oncommit(t) {
    l(At, this).add(t);
  }
  ondiscard(t) {
    l(mt, this).add(t);
  }
  settled() {
    var t;
    return ((t = l(Qe, this)) !== null && t !== void 0 ? t : y(Qe, this, Nn())).promise;
  }
  static ensure() {
    if (w === null) {
      const t = w = new sr();
      !qt && !nt && je(() => {
        t.started || t.flush();
      });
    }
    return w;
  }
  apply() {
    if (!Ye || !this.is_fork && this.prev === null && this.next === null) {
      P = null;
      return;
    }
    P = /* @__PURE__ */ new Map();
    for (const [t, [n]] of this.current) P.set(t, n);
    for (let t = Tt; t !== null; t = t.next)
      if (!(t === this || t.is_fork) && (t.id >= this.id || !g(C, t, lr).call(t, this)))
        for (const [n, r] of t.previous) P.has(n) || P.set(n, r);
  }
  schedule(t) {
    var n;
    if (Jt = t, !((n = t.b) === null || n === void 0) && n.is_pending && (t.f & 16777228) !== 0 && (t.f & 32768) === 0) {
      t.b.defer_effect(t);
      return;
    }
    l(Pe, this).push(t);
  }
};
rr = Xe;
function $n() {
  if (this.is_fork) return !0;
  for (const e of l($e, this).keys()) if (!g(C, this, Ii).call(this, e)) return !0;
  return !1;
}
function Ii(e) {
  for (var t = e; t !== null; t = t.parent) if (l(ve, this).has(t)) return !0;
  return !1;
}
function ar() {
  var e = [];
  for (const i of l(Pe, this))
    if (!((i.f & 16384) !== 0 || (i.f & 6144) === 0)) {
      for (var t = i, n = !1; t.parent !== null; ) {
        t = t.parent;
        var r = t.f;
        if ((r & 96) !== 0) {
          if ((r & 1024) === 0) {
            n = !0;
            break;
          }
          t.f ^= Y;
        }
      }
      n || e.push(t);
    }
  return y(Pe, this, []), e;
}
function Ot() {
  var e;
  this.started = !0;
  for (const [a, u] of l(pe, this))
    I(a, u), this.schedule(a);
  this.apply();
  for (var t = lt = [], n = [], r = Ct = []; l(Pe, this).length > 0; ) {
    ir++ > 1e3 && (g(C, this, jt).call(this), Bi());
    for (const a of g(C, this, ar).call(this)) try {
      g(C, this, or).call(this, a, t, n);
    } catch (u) {
      throw fr(a), g(C, this, $n).call(this) || this.discard(), u;
    }
  }
  if (w = null, r.length > 0) {
    var i = rr.ensure();
    for (const a of r) i.schedule(a);
  }
  if (lt = null, Ct = null, g(C, this, $n).call(this)) {
    g(C, this, tt).call(this, n), g(C, this, tt).call(this, t);
    for (const [a, u] of l(ve, this)) cr(a, u);
    r.length > 0 && g(C, w, Ot).call(w);
    return;
  }
  const s = g(C, this, Li).call(this);
  if (s) {
    g(C, this, tt).call(this, n), g(C, this, tt).call(this, t), g(C, s, Ri).call(s, this);
    return;
  }
  l(pe, this).clear();
  for (const a of l(At, this)) a(this);
  l(At, this).clear(), he = this, xn(n), xn(t), he = null, (e = l(Qe, this)) === null || e === void 0 || e.resolve();
  var o = w;
  l(ze, this) === 0 && (l(Pe, this).length === 0 || o !== null) && (g(C, this, jt).call(this), Ye && (g(C, this, Ni).call(this), w = o)), o !== null && (oe.clear(), g(C, o, Ot).call(o));
}
function or(e, t, n) {
  e.f ^= Y;
  for (var r = e.first; r !== null; ) {
    var i = r.f, s = (i & 96) !== 0;
    if (!(s && (i & 1024) !== 0 || (i & 8192) !== 0 || l(ve, this).has(r)) && r.fn !== null) {
      s ? r.f ^= Y : (i & 4) !== 0 ? t.push(r) : Ye && (i & 16777224) !== 0 ? n.push(r) : Ze(r) && ((i & 16) !== 0 && this.add_dirty_reaction(r, fe), Le(r));
      var o = r.first;
      if (o !== null) {
        r = o;
        continue;
      }
    }
    for (; r !== null; ) {
      var a = r.next;
      if (a !== null) {
        r = a;
        break;
      }
      r = r.parent;
    }
  }
}
function Li() {
  for (var e = this.prev; e !== null; e = e.prev) if (!e.is_fork && g(C, this, lr).call(this, e)) return e;
  return null;
}
function lr(e) {
  for (const [t, [, n]] of this.current)
    if (!n && e.current.has(t))
      return !0;
  return !1;
}
function Ri(e) {
  for (const [n, r] of e.current)
    !this.previous.has(n) && e.previous.has(n) && this.previous.set(n, e.previous.get(n)), this.current.set(n, r);
  for (const [n, r] of e.async_deriveds) {
    const i = this.async_deriveds.get(n);
    i && r.promise.then(i.resolve).catch(i.reject);
  }
  e.async_deriveds.clear(), this.transfer_reactions(l(pe, e));
  const t = (n) => {
    var r = n.reactions;
    if (r !== null && !((n.f & 2) !== 0 && (n.f & 6144) === 0))
      for (const o of r) {
        var i = o.f;
        if ((i & 2) !== 0) t(o);
        else {
          var s = o;
          i & 4194320 && !this.async_deriveds.has(s) && (l(pe, this).delete(s), I(s, U), this.schedule(s));
        }
      }
  };
  for (const n of this.current.keys()) t(n);
  this.oncommit(() => e.discard()), g(C, e, jt).call(e), w = this, g(C, this, Ot).call(this);
}
function tt(e) {
  for (var t = 0; t < e.length; t += 1) Zn(e[t], l(pe, this));
}
function Ni() {
  for (let v = Tt; v !== null; v = v.next) {
    var e = v.id < this.id, t = [];
    for (const [c, [f, d]] of this.current) {
      if (v.current.has(c)) {
        var n = v.current.get(c)[0];
        if (e && f !== n) v.current.set(c, [f, d]);
        else continue;
      }
      t.push(c);
    }
    if (e) for (const [c, f] of this.async_deriveds) {
      const d = v.async_deriveds.get(c);
      d && f.promise.then(d.resolve).catch(d.reject);
    }
    var r = [...v.current.keys()].filter((c) => !v.current.get(c)[1]);
    if (!(!v.started || r.length === 0)) {
      var i = r.filter((c) => !this.current.has(c));
      if (i.length === 0)
        e && v.discard();
      else if (t.length > 0) {
        if (e) for (const c of l(kt, this)) v.unskip_effect(c, (f) => {
          (f.f & 4194320) !== 0 ? v.schedule(f) : g(C, v, tt).call(v, [f]);
        });
        v.activate();
        var s = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Map();
        for (var a of t) ur(a, i, s, o);
        o = /* @__PURE__ */ new Map();
        var u = [...v.current].filter(([c, f]) => {
          const d = this.current.get(c);
          return d ? d[0] !== f[0] || d[1] !== f[1] : !0;
        }).map(([c]) => c);
        if (u.length > 0)
          for (const c of l(Qt, this)) (c.f & 155648) === 0 && dn(c, u, o) && ((c.f & 4194320) !== 0 ? (I(c, U), v.schedule(c)) : v.add_dirty_reaction(c, U));
        if (l(Pe, v).length > 0 && !l(et, v)) {
          v.apply();
          for (var h of g(C, v, ar).call(v)) g(C, v, or).call(v, h, [], []);
        }
        v.deactivate();
      }
    }
  }
}
function jt() {
  if (this.linked) {
    var e = this.prev, t = this.next;
    e === null ? Tt = t : e.next = t, t === null ? Be = e : t.prev = e, this.linked = !1;
  }
}
function fn(e) {
  var t = nt, n = he;
  he = null, nt = !0;
  try {
    var r;
    for (e && (fn(), r = e()); ; ) {
      if (xi(), w === null) return r;
      w.flush();
    }
  } finally {
    nt = t, he = n;
  }
}
function Bi() {
  if (0) {
    var e;
    for (const r of w.current.keys()) {
      var t;
      for (const [i, s] of (t = r.updated) !== null && t !== void 0 ? t : [])
        var n;
    }
  }
  try {
    _i();
  } catch (r) {
    le(r, Jt);
  }
}
var Z = null;
function xn(e) {
  var t = e.length;
  if (t !== 0) {
    for (var n = 0; n < t; ) {
      var r = e[n++];
      if ((r.f & 24576) === 0 && Ze(r) && (Z = /* @__PURE__ */ new Set(), Le(r), r.deps === null && r.first === null && r.nodes === null && r.teardown === null && r.ac === null && kr(r), (Z == null ? void 0 : Z.size) > 0)) {
        oe.clear();
        for (const i of Z) {
          if ((i.f & 24576) !== 0) continue;
          const s = [i];
          let o = i.parent;
          for (; o !== null; )
            Z.has(o) && (Z.delete(o), s.push(o)), o = o.parent;
          for (let a = s.length - 1; a >= 0; a--) {
            const u = s[a];
            (u.f & 24576) === 0 && Le(u);
          }
        }
        Z.clear();
      }
    }
    Z = null;
  }
}
function ur(e, t, n, r) {
  if (!n.has(e) && (n.add(e), e.reactions !== null))
    for (const i of e.reactions) {
      const s = i.f;
      (s & 2) !== 0 ? ur(i, t, n, r) : (s & 4194320) !== 0 && (s & 2048) === 0 && dn(i, t, r) && (I(i, U), vn(i));
    }
}
function dn(e, t, n) {
  const r = n.get(e);
  if (r !== void 0) return r;
  if (e.deps !== null) for (const i of e.deps) {
    if (it.call(t, i)) return !0;
    if ((i.f & 2) !== 0 && dn(i, t, n))
      return n.set(i, !0), !0;
  }
  return n.set(e, !1), !1;
}
function vn(e) {
  w.schedule(e);
}
function cr(e, t) {
  if (!((e.f & 32) !== 0 && (e.f & 1024) !== 0)) {
    (e.f & 2048) !== 0 ? t.d.push(e) : (e.f & 4096) !== 0 && t.m.push(e), I(e, Y);
    for (var n = e.first; n !== null; )
      cr(n, t), n = n.next;
  }
}
function fr(e) {
  I(e, Y);
  for (var t = e.first; t !== null; )
    fr(t), t = t.next;
}
var Pt = /* @__PURE__ */ new Set(), oe = /* @__PURE__ */ new Map();
var dr = !1;
function vt(e, t) {
  var n = {
    f: 0,
    v: e,
    reactions: null,
    equals: qn,
    rv: 0,
    wv: 0
  };
  return n;
}
// @__NO_SIDE_EFFECTS__
function de(e, t) {
  const n = vt(e, t);
  return as(n), n;
}
// @__NO_SIDE_EFFECTS__
function vr(e, t = !1, n = !0) {
  const r = vt(e);
  if (t || (r.equals = Vn), Ge && n && j !== null && j.l !== null) {
    var i, s;
    ((s = (i = j.l).s) !== null && s !== void 0 ? s : i.s = []).push(r);
  }
  return r;
}
function se(e, t, n = !1) {
  k !== null && (!J || (k.f & 131072) !== 0) && dt() && (k.f & 4325394) !== 0 && (te === null || !te.has(e)) && bi();
  let r = n ? De(t) : t;
  return It(e, r, Ct);
}
var xe = null, en = 0;
function It(e, t, n = null) {
  if (!e.equals(t)) {
    ce ? oe.set(e, t) : oe.has(e) || oe.set(e, e.v);
    var r = Xe.ensure();
    if (r.capture(e, t), 0 && (tracing_mode_flag || b !== null))
      var i, s, o;
    if ((e.f & 2) !== 0) {
      const a = e;
      (e.f & 2048) !== 0 && un(a), P === null && ln(a);
    }
    e.wv = Sr(), xe = null, en = 0, hr(e, U, n), xe = null, dt() && b !== null && (b.f & 1024) !== 0 && (b.f & 96) === 0 && (V === null ? os([e]) : V.push(e)), !r.is_fork && Pt.size > 0 && !dr && zi();
  }
  return t;
}
function zi() {
  dr = !1;
  for (const e of Pt) {
    (e.f & 1024) !== 0 && I(e, fe);
    let t;
    try {
      t = Ze(e);
    } catch (n) {
      t = !0;
    }
    t && Le(e);
  }
  Pt.clear();
}
function rt(e) {
  se(e, e.v + 1);
}
function hr(e, t, n) {
  var r = e.reactions;
  if (r !== null) {
    var i = dt(), s = r.length;
    if (en += s, en > 1e5 && xe === null && (xe = /* @__PURE__ */ new Set()), xe !== null) {
      if (xe.has(e)) return;
      xe.add(e);
    }
    for (var o = 0; o < s; o++) {
      var a = r[o], u = a.f;
      if (!(!i && a === b)) {
        var h = (u & U) === 0;
        if (h && I(a, t), (u & 131072) !== 0) Pt.add(a);
        else if ((u & 2) !== 0) {
          var v = a;
          P == null || P.delete(v), hr(v, fe, n);
        } else if (h) {
          var c = a;
          (u & 16) !== 0 && Z !== null && Z.add(c), n !== null ? n.push(c) : vn(c);
        }
      }
    }
  }
}
var Wi = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;
function De(e) {
  if (typeof e != "object" || e === null || He in e || Hn in e) return e;
  const t = Rn(e);
  if (t !== Yr && t !== Gr) return e;
  var n = /* @__PURE__ */ new Map(), r = Hr(e), i = /* @__PURE__ */ de(0), s = null, o = Ce, a = (c) => {
    if (Ce === o) return c();
    var f = k, d = Ce;
    G(null), Mn(o);
    var _ = c();
    return G(f), Mn(d), _;
  };
  r && n.set("length", /* @__PURE__ */ de(e.length, s));
  var u = "";
  let h = !1;
  function v(c) {
    if (!h) {
      h = !0, u = c, bn(i, `${u} version`);
      for (const [f, d] of n) bn(d, Fi(u, f));
      h = !1;
    }
  }
  return new Proxy(e, {
    defineProperty(c, f, d) {
      (!("value" in d) || d.configurable === !1 || d.enumerable === !1 || d.writable === !1) && wi();
      var _ = n.get(f);
      return _ === void 0 ? a(() => {
        var p = /* @__PURE__ */ de(d.value, s);
        return n.set(f, p), p;
      }) : se(_, d.value, !0), !0;
    },
    deleteProperty(c, f) {
      var d = n.get(f);
      if (d === void 0) {
        if (f in c) {
          const _ = a(() => /* @__PURE__ */ de(L, s));
          n.set(f, _), rt(i);
        }
      } else
        se(d, L), rt(i);
      return !0;
    },
    get(c, f, d) {
      var _;
      if (f === He) return e;
      var p = n.get(f), $ = f in c;
      if (p === void 0 && (!$ || !((_ = Te(c, f)) === null || _ === void 0) && _.writable) && (p = a(() => {
        var m = De($ ? c[f] : L), S = /* @__PURE__ */ de(m, s);
        return S;
      }), n.set(f, p)), p !== void 0) {
        var x = R(p);
        return x === L ? void 0 : x;
      }
      return Reflect.get(c, f, d);
    },
    getOwnPropertyDescriptor(c, f) {
      var d;
      (d = this.has) === null || d === void 0 || d.call(this, c, f);
      var _ = Reflect.getOwnPropertyDescriptor(c, f), p = n.get(f);
      if (p !== void 0) {
        var $ = R(p);
        if ($ === L) return;
        if (_ && "value" in _) _.value = $;
        else return {
          enumerable: !0,
          configurable: !0,
          value: $,
          writable: !0
        };
      }
      return _;
    },
    has(c, f) {
      var d;
      if (f === He) return !0;
      var _ = n.get(f), p = _ !== void 0 && _.v !== L || Reflect.has(c, f);
      return (_ !== void 0 || (b !== null || k !== null) && (!p || !((d = Te(c, f)) === null || d === void 0) && d.writable)) && (_ === void 0 && (_ = a(() => {
        var $ = p ? De(c[f]) : L, x = /* @__PURE__ */ de($, s);
        return x;
      }), n.set(f, _)), R(_) === L) ? !1 : p;
    },
    set(c, f, d, _) {
      var p = n.get(f), $ = f in c;
      if (r && f === "length") for (var x = d; x < p.v; x += 1) {
        var m = n.get(x + "");
        m !== void 0 ? se(m, L) : x in c && (m = a(() => /* @__PURE__ */ de(L, s)), n.set(x + "", m));
      }
      if (p === void 0) {
        var S;
        (!$ || !((S = Te(c, f)) === null || S === void 0) && S.writable) && (p = a(() => /* @__PURE__ */ de(void 0, s)), se(p, De(d)), n.set(f, p));
      } else {
        $ = p.v !== L;
        var N = a(() => De(d));
        se(p, N);
      }
      var X = Reflect.getOwnPropertyDescriptor(c, f);
      if (X != null && X.set && X.set.call(_, d), !$) {
        if (r && typeof f == "string") {
          var E = n.get("length"), B = Number(f);
          Number.isInteger(B) && B >= E.v && se(E, B + 1);
        }
        rt(i);
      }
      return !0;
    },
    ownKeys(c) {
      R(i);
      var f = Reflect.ownKeys(c).filter((p) => {
        var $ = n.get(p);
        return $ === void 0 || $.v !== L;
      });
      for (var [d, _] of n) _.v !== L && !(d in c) && f.push(d);
      return f;
    },
    setPrototypeOf() {
      yi();
    }
  });
}
function Fi(e, t) {
  var n;
  return typeof t == "symbol" ? `${e}[Symbol(${(n = t.description) !== null && n !== void 0 ? n : ""})]` : Wi.test(t) ? `${e}.${t}` : /^\d+$/.test(t) ? `${e}[${t}]` : `${e}['${t}']`;
}
var Sn, Di, Hi, pr, _r;
function tn() {
  if (Sn === void 0) {
    Sn = window, Di = document, Hi = /Firefox/.test(navigator.userAgent);
    var e = Element.prototype, t = Node.prototype, n = Text.prototype;
    pr = Te(t, "firstChild").get, _r = Te(t, "nextSibling").get, wn(e) && (e[ni] = void 0, e[ti] = null, e[ri] = void 0, e.__e = void 0), wn(n) && (n[ii] = void 0);
  }
}
function zt(e = "") {
  return document.createTextNode(e);
}
// @__NO_SIDE_EFFECTS__
function Se(e) {
  return pr.call(e);
}
// @__NO_SIDE_EFFECTS__
function we(e) {
  return _r.call(e);
}
function Ui(e, t = !1) {
  if (!z) {
    var n = /* @__PURE__ */ Se(e);
    return n instanceof Comment && n.data === "" ? /* @__PURE__ */ we(n) : n;
  }
  if (t) {
    if ((O == null ? void 0 : O.nodeType) !== 3) {
      var r = zt();
      return O == null || O.before(r), ge(r), r;
    }
    Vi(O);
  }
  return O;
}
function qi(e) {
  e.textContent = "";
}
function mr(e, t, n) {
  return t == null || t === "http://www.w3.org/1999/xhtml" ? n ? document.createElement(e, { is: n }) : document.createElement(e) : n ? document.createElementNS(t, e, { is: n }) : document.createElementNS(t, e);
}
function Vi(e) {
  if (e.nodeValue.length < 65536) return;
  let t = e.nextSibling;
  for (; t !== null && t.nodeType === 3; )
    t.remove(), e.nodeValue += t.nodeValue, t = e.nextSibling;
}
function Yi(e) {
  var t = b;
  if (t === null)
    return k.f |= St, e;
  if ((t.f & 32768) === 0 && (t.f & 4) === 0)
    throw e;
  le(e, t);
}
function le(e, t) {
  if (e === me) throw e;
  if (!(t !== null && (t.f & 16384) !== 0)) {
    for (; t !== null; ) {
      if ((t.f & 128) !== 0 && (t.f & 33570816) === 0) {
        if ((t.f & 32768) === 0) throw e;
        try {
          t.b.error(e);
          return;
        } catch (n) {
          e = n;
        }
      }
      t = t.parent;
    }
    throw e;
  }
}
function gr(e) {
  b === null && (k === null && pi(e), hi()), ce && vi(e);
}
function Gi(e, t) {
  var n = t.last;
  n === null ? t.last = t.first = e : (n.next = e, e.prev = n, t.last = e);
}
function ue(e, t) {
  var n = b;
  n !== null && (n.f & 8192) !== 0 && (e |= Bn);
  var r = {
    ctx: j,
    deps: null,
    nodes: null,
    f: e | U | 512,
    first: null,
    fn: t,
    last: null,
    next: null,
    parent: n,
    b: n && n.b,
    prev: null,
    teardown: null,
    wv: 0,
    ac: null
  };
  w == null || w.register_created_effect(r);
  var i = r;
  if ((e & 4) !== 0)
    lt !== null ? lt.push(r) : Xe.ensure().schedule(r);
  else if (t !== null) {
    try {
      Le(r);
    } catch (a) {
      throw ee(r), a;
    }
    i.deps === null && i.teardown === null && i.nodes === null && i.first === i.last && (i.f & 524288) === 0 && (i = i.first, (e & 16) !== 0 && (e & 65536) !== 0 && i !== null && (i.f |= Fn));
  }
  if (i !== null && (i.parent = n, n !== null && Gi(i, n), k !== null && (k.f & 2) !== 0 && (e & 64) === 0)) {
    var s, o = k;
    ((s = o.effects) !== null && s !== void 0 ? s : o.effects = []).push(i);
  }
  return r;
}
function hn() {
  return k !== null && !J;
}
function Ki(e) {
  const t = ue(8, null);
  return I(t, Y), t.teardown = e, t;
}
function nn(e) {
  gr("$effect");
  var t = b.f;
  if (!k && (t & 32) !== 0 && j !== null && !j.i) {
    var n, r = j;
    ((n = r.e) !== null && n !== void 0 ? n : r.e = []).push(e);
  } else return wr(e);
}
function wr(e) {
  return ue(4 | Dn, e);
}
function Xi(e) {
  return gr("$effect.pre"), ue(8 | Dn, e);
}
function Zi(e) {
  Xe.ensure();
  const t = ue(64 | Ke, e);
  return () => {
    ee(t);
  };
}
function Ji(e) {
  Xe.ensure();
  const t = ue(64 | Ke, e);
  return (n = {}) => new Promise((r) => {
    n.outro ? Ft(t, () => {
      ee(t), r(void 0);
    }) : (ee(t), r(void 0));
  });
}
function Qi(e, t) {
  var n = j, r = {
    effect: null,
    ran: !1,
    deps: e
  };
  n.l.$.push(r), r.effect = Wt(() => {
    if (e(), !r.ran) {
      r.ran = !0;
      var i = b;
      try {
        K(i.parent), ht(t);
      } finally {
        K(i);
      }
    }
  });
}
function es() {
  var e = j;
  Wt(() => {
    for (var t of e.l.$) {
      t.deps();
      var n = t.effect;
      (n.f & 1024) !== 0 && n.deps !== null && I(n, fe), Ze(n) && Le(n), t.ran = !1;
    }
  });
}
function ts(e) {
  return ue(Qr | Ke, e);
}
function Wt(e, t = 0) {
  return ue(8 | t, e);
}
function ns(e, t = [], n = [], r = []) {
  Mi(r, t, n, (i) => {
    ue(8, () => {
      e(...i.map(R));
    });
  });
}
function rs(e, t = 0) {
  var n = ue(16 | t, e);
  return n;
}
function Ie(e) {
  return ue(32 | Ke, e);
}
function yr(e) {
  var t = e.teardown;
  if (t !== null) {
    const n = ce, r = k;
    En(!0), G(null);
    try {
      t.call(null);
    } catch (i) {
      le(i, e.parent);
    } finally {
      En(n), G(r);
    }
  }
}
function pn(e, t = !1) {
  var n = e.first;
  for (e.first = e.last = null; n !== null; ) {
    const i = n.ac;
    i !== null && Bt(() => {
      i.abort(ft);
    });
    var r = n.next;
    (n.f & 64) !== 0 ? n.parent = null : ee(n, t), n = r;
  }
}
function is(e) {
  for (var t = e.first; t !== null; ) {
    var n = t.next;
    (t.f & 32) === 0 && ee(t), t = n;
  }
}
function ee(e, t = !0) {
  var n = !1;
  (t || (e.f & 262144) !== 0) && e.nodes !== null && e.nodes.end !== null && (br(e.nodes.start, e.nodes.end), n = !0), e.f |= Zt, pn(e, t && !n), ut(e, 0);
  var r = e.nodes && e.nodes.t;
  if (r !== null) for (const s of r) s.stop();
  yr(e), e.f ^= Zt, e.f |= zn;
  var i = e.parent;
  i !== null && i.first !== null && kr(e), e.next = e.prev = e.teardown = e.ctx = e.deps = e.fn = e.nodes = e.ac = e.b = null;
}
function br(e, t) {
  for (; e !== null; ) {
    var n = e === t ? null : /* @__PURE__ */ we(e);
    e.remove(), e = n;
  }
}
function kr(e) {
  var t = e.parent, n = e.prev, r = e.next;
  n !== null && (n.next = r), r !== null && (r.prev = n), t !== null && (t.first === e && (t.first = r), t.last === e && (t.last = n));
}
function Ft(e, t, n = !0) {
  var r = [];
  e.f |= 256, $r(e, r, !0);
  var i = () => {
    n && ee(e), t && t();
  }, s = r.length;
  if (s > 0) {
    var o = () => --s || i();
    for (var a of r) a.out(o);
  } else i();
}
function $r(e, t, n) {
  if ((e.f & 8192) === 0) {
    e.f ^= Bn;
    var r = e.nodes && e.nodes.t;
    if (r !== null)
      for (const a of r) (a.is_global || n) && t.push(a);
    for (var i = e.first; i !== null; ) {
      var s = i.next;
      if ((i.f & 64) === 0) {
        var o = (i.f & 65536) !== 0 || (i.f & 32) !== 0 && (e.f & 16) !== 0;
        $r(i, t, o ? n : !1);
      }
      i = s;
    }
  }
}
function ss(e, t) {
  if (e.nodes)
    for (var n = e.nodes.start, r = e.nodes.end; n !== null; ) {
      var i = n === r ? null : /* @__PURE__ */ we(n);
      t.append(n), n = i;
    }
}
var Vt = null, ce = !1;
function En(e) {
  ce = e;
}
var k = null, J = !1;
function G(e) {
  k = e;
}
var b = null;
function K(e) {
  b = e;
}
var te = null;
function as(e) {
  if (k !== null && (!Ye && (k.f & 2097152) !== 0 || (k.f & 2) !== 0)) {
    var t;
    ((t = te) !== null && t !== void 0 ? t : te = /* @__PURE__ */ new Set()).add(e);
  }
}
var W = null, D = 0, V = null;
function os(e) {
  V = e;
}
var xr = 1, Me = 0, Ce = Me;
function Mn(e) {
  Ce = e;
}
function Sr() {
  return ++xr;
}
function Ze(e) {
  var t = e.f;
  if ((t & 2048) !== 0) return !0;
  if ((t & 4096) !== 0) {
    for (var n = e.deps, r = n.length, i = 0; i < r; i++) {
      var s = n[i];
      if (Ze(s) && er(s), s.wv > e.wv) return !0;
    }
    (t & 512) !== 0 && P === null && I(e, Y);
  }
  return !1;
}
function Er(e, t, n = !0) {
  var r = e.reactions;
  if (r !== null && !(!Ye && te !== null && te.has(e)))
    for (var i = 0; i < r.length; i++) {
      var s = r[i];
      (s.f & 2) !== 0 ? Er(s, t, !1) : t === s && (n ? I(s, U) : (s.f & 1024) !== 0 && I(s, fe), vn(s));
    }
}
function Mr(e) {
  var t = W, n = D, r = V, i = k, s = te, o = j, a = J, u = Ce, h = e.f;
  W = null, D = 0, V = null, k = (h & 96) === 0 ? e : null, te = null, Ve(e.ctx), J = !1, Ce = ++Me, e.ac !== null && (Bt(() => {
    e.ac.abort(ft);
  }), e.ac = null);
  try {
    e.f |= yn;
    var v = e.fn, c = v();
    e.f |= Wn;
    var f = Tn(e);
    if (dt() && V !== null && !J && f !== null && (e.f & 6146) === 0) for (var d = 0; d < V.length; d++) Er(V[d], e);
    if (i !== null && i !== e) {
      if (Me++, i.deps !== null) for (let _ = 0; _ < n; _ += 1) i.deps[_].rv = Me;
      if (t !== null) for (const _ of t) _.rv = Me;
      V !== null && (r === null ? r = V : r.push(...V));
    }
    return (e.f & 8388608) !== 0 && (e.f ^= St), c;
  } catch (_) {
    return Tn(e), Yi(_);
  } finally {
    e.f ^= yn, W = t, D = n, V = r, k = i, te = s, Ve(o), J = a, Ce = u;
  }
}
function Tn(e) {
  var t = e.deps, n = w == null ? void 0 : w.is_fork;
  if (W !== null) {
    var r;
    if (n || ut(e, D), t !== null && D > 0)
      for (t.length = D + W.length, r = 0; r < W.length; r++) t[D + r] = W[r];
    else e.deps = t = W;
    if (hn() && (e.f & 512) !== 0) for (r = D; r < t.length; r++) {
      var i, s;
      ((s = (i = t[r]).reactions) !== null && s !== void 0 ? s : i.reactions = []).push(e);
    }
  } else !n && t !== null && D < t.length && (ut(e, D), t.length = D);
  return t;
}
function ls(e, t) {
  let n = t.reactions;
  if (n !== null) {
    var r = Ur.call(n, e);
    if (r !== -1) {
      var i = n.length - 1;
      i === 0 ? n = t.reactions = null : (n[r] = n[i], n.pop());
    }
  }
  if (n === null && (t.f & 2) !== 0 && (W === null || !it.call(W, t))) {
    var s = t;
    (s.f & 512) !== 0 && (s.f ^= 512), s.v !== L && ln(s), s.ac !== null && Bt(() => {
      s.ac.abort(ft), s.ac = null, I(s, U);
    }), ji(s), ut(s, 0);
  }
}
function ut(e, t) {
  var n = e.deps;
  if (n !== null)
    for (var r = t; r < n.length; r++) ls(e, n[r]);
}
function Le(e) {
  var t = e.f;
  if ((t & 16384) === 0) {
    I(e, Y);
    var n = b;
    if (b = e, 0)
      var r, i, s;
    try {
      (t & 16777232) !== 0 ? is(e) : pn(e), yr(e);
      var o = Mr(e);
      if (e.teardown = typeof o == "function" ? o : null, e.wv = xr, 0)
        for (var a of e.deps) ;
    } finally {
      b = n;
    }
  }
}
function R(e) {
  var t = (e.f & 2) !== 0;
  if (Vt == null || Vt.add(e), k !== null && !J && !(b !== null && (b.f & 16384) !== 0) && (te === null || !te.has(e))) {
    var n = k.deps;
    if ((k.f & 2097152) !== 0)
      e.rv < Me && (e.rv = Me, W === null && n !== null && n[D] === e ? D++ : W === null ? W = [e] : W.push(e));
    else {
      var r, i;
      (i = (r = k).deps) !== null && i !== void 0 || (r.deps = []), it.call(k.deps, e) || k.deps.push(e);
      var s = e.reactions;
      s === null ? e.reactions = [k] : it.call(s, k) || s.push(k);
    }
  }
  if (0) {
    if (!J && reactivity_loss_tracker && w === null && he === null && !reactivity_loss_tracker.warned && (reactivity_loss_tracker.effect.f & 2097152) === 0 && !reactivity_loss_tracker.effect_deps.has(e))
      var o;
    if (tracing_mode_flag && !J && tracing_expressions !== null && k !== null && tracing_expressions.reaction === k && !e.trace) {
      if (o)
        var a, u;
    }
  }
  if (ce && oe.has(e)) return oe.get(e);
  if (t) {
    var h = e;
    if (ce) {
      var v = h.v;
      return ((h.f & 1024) === 0 && h.reactions !== null || Cr(h)) && (v = un(h)), oe.set(h, v), v;
    }
    var c = (h.f & 512) === 0 && !J && k !== null && (k.f & 512) !== 0, f = (h.f & Wn) === 0;
    Ze(h) && (c && (h.f |= 512), er(h)), c && !f && (tr(h), Tr(h));
  }
  if (P != null && P.has(e)) return P.get(e);
  if ((e.f & 8388608) !== 0) throw e.v;
  return e.v;
}
function Tr(e) {
  if (e.f |= 512, e.deps !== null)
    for (const n of e.deps) {
      var t = n.reactions;
      t === null ? n.reactions = [e] : it.call(t, e) || t.push(e), (n.f & 2) !== 0 && (n.f & 512) === 0 && (tr(n), Tr(n));
    }
}
function Cr(e) {
  if (e.v === L) return !0;
  if (e.deps === null) return !1;
  for (const t of e.deps)
    if (oe.has(t) || (t.f & 2) !== 0 && Cr(t)) return !0;
  return !1;
}
function ht(e) {
  var t = J;
  try {
    return J = !0, e();
  } finally {
    J = t;
  }
}
function Ar(e) {
  if (!(typeof e != "object" || !e || e instanceof EventTarget)) {
    if (He in e) rn(e);
    else if (!Array.isArray(e)) for (let t in e) {
      const n = e[t];
      typeof n == "object" && n && He in n && rn(n);
    }
  }
}
function rn(e, t = /* @__PURE__ */ new Set()) {
  if (typeof e == "object" && e !== null && !(e instanceof EventTarget) && !t.has(e)) {
    t.add(e), e instanceof Date && e.getTime();
    for (let r in e) try {
      rn(e[r], t);
    } catch (i) {
    }
    const n = Rn(e);
    if (n !== Object.prototype && n !== Array.prototype && n !== Map.prototype && n !== Set.prototype && n !== Date.prototype) {
      const r = Vr(n);
      for (let i in r) {
        const s = r[i].get;
        if (s) try {
          s.call(e);
        } catch (o) {
        }
      }
    }
  }
}
var gt = /* @__PURE__ */ Symbol("events"), us = /* @__PURE__ */ new Set(), Cn = /* @__PURE__ */ new Set(), Yt = null, Gt = !1;
function An(e) {
  var t, n = this, r = n.ownerDocument, i = e.type, s = ((t = e.composedPath) === null || t === void 0 ? void 0 : t.call(e)) || [], o = s[0] || e.target;
  Yt = e, Gt || (Gt = !0, setTimeout(() => {
    Gt = !1, Yt = null;
  }));
  var a = 0, u = Yt === e && e[gt];
  if (u) {
    var h = s.indexOf(u);
    if (h !== -1 && (n === document || n === window)) {
      e[gt] = n;
      return;
    }
    var v = s.indexOf(n);
    if (v === -1) return;
    h <= v && (a = h);
  }
  if (o = s[a] || e.target, o !== n) {
    st(e, "currentTarget", {
      configurable: !0,
      get() {
        return o || r;
      }
    });
    var c = k, f = b;
    G(null), K(null);
    try {
      for (var d, _ = []; o !== null && o !== n; ) {
        try {
          var p, $ = (p = o[gt]) === null || p === void 0 ? void 0 : p[i];
          $ != null && (!o.disabled || e.target === o) && $.call(o, e);
        } catch (x) {
          d ? _.push(x) : d = x;
        }
        if (e.cancelBubble) break;
        a++, o = a < s.length ? s[a] : null;
      }
      if (d) {
        for (let x of _) queueMicrotask(() => {
          throw x;
        });
        throw d;
      }
    } finally {
      e[gt] = n, delete e.currentTarget, G(c), K(f);
    }
  }
}
var Ne, Ds = ((Ne = globalThis) === null || Ne === void 0 || (Ne = Ne.window) === null || Ne === void 0 ? void 0 : Ne.trustedTypes) && /* @__PURE__ */ globalThis.window.trustedTypes.createPolicy("svelte-trusted-html", { createHTML: (e) => e });
function Ue(e, t) {
  var n = b;
  n.nodes === null && (n.nodes = {
    start: e,
    end: t,
    a: null,
    t: null
  });
}
function cs() {
  if (z)
    return Ue(O, null), O;
  var e = document.createDocumentFragment(), t = document.createComment(""), n = zt();
  return e.append(t, n), Ue(t, n), e;
}
function Or(e, t) {
  if (z) {
    var n = b;
    ((n.f & 32768) === 0 || n.nodes.end === null) && (n.nodes.end = O), Et();
    return;
  }
  e !== null && e.before(t);
}
var fs = [
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
], Hs = [
  ...fs,
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
], ds = ["touchstart", "touchmove"];
function vs(e) {
  return ds.includes(e);
}
var hs = [
  "$state",
  "$state.raw",
  "$derived",
  "$derived.by"
], Us = [
  ...hs,
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
function ps(e) {
  let t = 0, n = vt(0), r;
  return () => {
    hn() && (R(n), Wt(() => (t === 0 && (r = ht(() => e(() => rt(n)))), t += 1, () => {
      je(() => {
        t -= 1, t === 0 && (r == null || r(), r = void 0, rt(n));
      });
    })));
  };
}
var _s = Fn | Ke;
function ms(e, t, n, r) {
  new gs(e, t, n, r);
}
var ne = /* @__PURE__ */ new WeakMap(), sn = /* @__PURE__ */ new WeakMap(), ae = /* @__PURE__ */ new WeakMap(), ct = /* @__PURE__ */ new WeakMap(), F = /* @__PURE__ */ new WeakMap(), re = /* @__PURE__ */ new WeakMap(), H = /* @__PURE__ */ new WeakMap(), Q = /* @__PURE__ */ new WeakMap(), _e = /* @__PURE__ */ new WeakMap(), We = /* @__PURE__ */ new WeakMap(), Ae = /* @__PURE__ */ new WeakMap(), wt = /* @__PURE__ */ new WeakMap(), an = /* @__PURE__ */ new WeakMap(), be = /* @__PURE__ */ new WeakMap(), On = /* @__PURE__ */ new WeakMap(), A = /* @__PURE__ */ new WeakSet(), gs = class {
  constructor(e, t, n, r) {
    var i, s;
    cn(this, A), T(this, "parent", void 0), T(this, "is_pending", !1), T(this, "transform_error", void 0), M(this, ne, void 0), M(this, sn, z ? O : null), M(this, ae, void 0), M(this, ct, void 0), M(this, F, void 0), M(this, re, null), M(this, H, null), M(this, Q, null), M(this, _e, null), M(this, We, 0), M(this, Ae, 0), M(this, wt, !1), M(this, an, /* @__PURE__ */ new Map()), M(this, be, null), M(this, On, ps(() => (y(be, this, vt(l(We, this))), () => {
      y(be, this, null);
    }))), y(ne, this, e), y(ae, this, t), y(ct, this, (o) => {
      var a = b;
      a.b = this, a.f |= 128, n(o);
    }), this.parent = b.b, this.transform_error = (i = r != null ? r : (s = this.parent) === null || s === void 0 ? void 0 : s.transform_error) !== null && i !== void 0 ? i : ((o) => o), y(F, this, rs(() => {
      if (z) {
        const o = ui(l(sn, this));
        Et();
        const a = o === "[!";
        if (o.startsWith("[?")) {
          const u = JSON.parse(o.slice(2));
          g(A, this, ys).call(this, u);
        } else a ? g(A, this, bs).call(this) : g(A, this, ws).call(this);
      } else g(A, this, Pr).call(this);
    }, _s)), z && y(ne, this, O);
  }
  defer_effect(e) {
    Zn(e, l(an, this));
  }
  is_rendered() {
    return !this.is_pending && (!this.parent || this.parent.is_rendered());
  }
  has_pending_snippet() {
    return !!l(ae, this).pending;
  }
  update_pending_count(e, t) {
    g(A, this, Ir).call(this, e, t), y(We, this, l(We, this) + e), !(!l(be, this) || l(wt, this)) && (y(wt, this, !0), je(() => {
      y(wt, this, !1), l(be, this) && It(l(be, this), l(We, this));
    }));
  }
  get_effect_pending() {
    return l(On, this).call(this), R(l(be, this));
  }
  error(e) {
    if (e === me || !l(ae, this).onerror && !l(ae, this).failed) throw e;
    w != null && w.is_fork ? (l(re, this) && w.skip_effect(l(re, this)), l(H, this) && w.skip_effect(l(H, this)), l(Q, this) && w.skip_effect(l(Q, this)), w.oncommit(() => {
      g(A, this, Oe).call(this) || g(A, this, jn).call(this, e);
    })) : g(A, this, jn).call(this, e);
  }
};
function ws() {
  try {
    y(re, this, Ie(() => l(ct, this).call(this, l(ne, this))));
  } catch (e) {
    this.error(e);
  }
}
function ys(e) {
  const t = l(ae, this).failed, { reset: n, invoke_onerror: r } = g(A, this, jr).call(this, e);
  je(r), t && y(Q, this, Ie(() => {
    t(l(ne, this), () => e, () => n);
  }));
}
function jr(e) {
  var t = !1, n = !1;
  const r = () => {
    if (!g(A, this, Oe).call(this)) {
      if (t) {
        ai();
        return;
      }
      t = !0, n && ki(), l(Q, this) !== null && Ft(l(Q, this), () => {
        y(Q, this, null);
      }), g(A, this, _n).call(this, () => {
        g(A, this, Pr).call(this);
      });
    }
  };
  return {
    reset: r,
    invoke_onerror: () => {
      if (!g(A, this, Oe).call(this))
        try {
          var s, o;
          n = !0, (s = (o = l(ae, this)).onerror) === null || s === void 0 || s.call(o, e, r), n = !1;
        } catch (a) {
          le(a, l(F, this) && l(F, this).parent);
        }
    }
  };
}
function Oe() {
  return (l(F, this).f & (zn | Zt)) !== 0;
}
function bs() {
  const e = l(ae, this).pending;
  e && (this.is_pending = !0, y(H, this, Ie(() => e(l(ne, this)))), je(() => {
    if (!g(A, this, Oe).call(this)) {
      var t = y(_e, this, document.createDocumentFragment()), n = zt(), r = !1;
      if (t.append(n), y(re, this, g(A, this, _n).call(this, () => {
        try {
          return Ie(() => l(ct, this).call(this, n));
        } catch (i) {
          try {
            this.error(i), r = !0;
          } catch (s) {
            le(s, l(F, this).parent);
          }
          return null;
        }
      })), l(re, this) === null) {
        y(_e, this, null), r && g(A, this, Lt).call(this, w);
        return;
      }
      l(Ae, this) === 0 && (l(ne, this).before(t), y(_e, this, null), Ft(l(H, this), () => {
        y(H, this, null);
      }), g(A, this, Lt).call(this, w));
    }
  }));
}
function Pr() {
  try {
    if (this.is_pending = this.has_pending_snippet(), y(Ae, this, 0), y(We, this, 0), y(re, this, Ie(() => {
      l(ct, this).call(this, l(ne, this));
    })), l(Ae, this) > 0) {
      var e = y(_e, this, document.createDocumentFragment());
      ss(l(re, this), e);
      const t = l(ae, this).pending;
      y(H, this, Ie(() => t(l(ne, this))));
    } else g(A, this, Lt).call(this, w);
  } catch (t) {
    this.error(t);
  }
}
function Lt(e) {
  this.is_pending = !1, e.transfer_reactions(l(an, this));
}
function _n(e) {
  var t = b, n = k, r = j;
  K(l(F, this)), G(l(F, this)), Ve(l(F, this).ctx);
  try {
    return Xe.ensure(), e();
  } finally {
    K(t), G(n), Ve(r);
  }
}
function Ir(e, t) {
  if (!this.has_pending_snippet()) {
    if (this.parent) {
      var n;
      g(A, n = this.parent, Ir).call(n, e, t);
    }
    return;
  }
  y(Ae, this, l(Ae, this) + e), l(Ae, this) === 0 && (g(A, this, Lt).call(this, t), l(H, this) && Ft(l(H, this), () => {
    y(H, this, null);
  }), l(_e, this) && (l(ne, this).before(l(_e, this)), y(_e, this, null)));
}
function jn(e) {
  l(re, this) && (ee(l(re, this)), y(re, this, null)), l(H, this) && (ee(l(H, this)), y(H, this, null)), l(Q, this) && (ee(l(Q, this)), y(Q, this, null)), z && (ge(l(sn, this)), oi(), ge(li()));
  let t = l(ae, this).failed;
  const n = (r) => {
    if (g(A, this, Oe).call(this)) return;
    const { reset: i, invoke_onerror: s } = g(A, this, jr).call(this, r);
    s(), t && !g(A, this, Oe).call(this) && y(Q, this, g(A, this, _n).call(this, () => {
      try {
        return Ie(() => {
          var o = b;
          o.b = this, o.f |= 128, t(l(ne, this), () => r, () => i);
        });
      } catch (o) {
        return le(o, l(F, this).parent), null;
      }
    }));
  };
  je(() => {
    if (!g(A, this, Oe).call(this)) {
      var r;
      try {
        r = this.transform_error(e);
      } catch (i) {
        le(i, l(F, this) && l(F, this).parent);
        return;
      }
      r !== null && typeof r == "object" && typeof r.then == "function" ? r.then(n, (i) => le(i, l(F, this) && l(F, this).parent)) : n(r);
    }
  });
}
var Pn = !0;
function Lr(e, t) {
  return Rr(e, t);
}
function ks(e, t) {
  var n;
  tn(), t.intro = (n = t.intro) !== null && n !== void 0 ? n : !1;
  const r = t.target, i = z, s = O;
  try {
    for (var o = /* @__PURE__ */ Se(r); o && (o.nodeType !== 8 || o.data !== "["); ) o = /* @__PURE__ */ we(o);
    if (!o) throw me;
    pt(!0), ge(o);
    const a = Rr(e, qe(qe({}, t), {}, { anchor: o }));
    return pt(!1), a;
  } catch (a) {
    if (a instanceof Error && a.message.split(`
`).some((u) => u.startsWith("https://svelte.dev/e/"))) throw a;
    return a !== me && console.warn("Failed to hydrate: ", a), t.recover === !1 && mi(), tn(), qi(r), pt(!1), Lr(e, t);
  } finally {
    pt(i), ge(s);
  }
}
var yt = /* @__PURE__ */ new Map();
function Rr(e, { target: t, anchor: n, props: r = {}, events: i, context: s, intro: o = !0, transformError: a }) {
  tn();
  var u = void 0, h = Ji(() => {
    var v = n != null ? n : t.appendChild(zt());
    ms(v, { pending: () => {
    } }, (d) => {
      Yn({});
      var _ = j;
      if (s && (_.c = s), i && (r.$$events = i), z && Ue(d, null), Pn = o, u = e(d, r) || Kn(), Pn = !0, z && (b.nodes.end = O, O === null || O.nodeType !== 8 || O.data !== "]"))
        throw Nt(), me;
      Gn();
    }, a);
    var c = /* @__PURE__ */ new Set(), f = (d) => {
      for (var _ = 0; _ < d.length; _++) {
        var p = d[_];
        if (!c.has(p)) {
          c.add(p);
          var $ = vs(p);
          for (const S of [t, document]) {
            var x = yt.get(S);
            x === void 0 && (x = /* @__PURE__ */ new Map(), yt.set(S, x));
            var m = x.get(p);
            m === void 0 ? (S.addEventListener(p, An, { passive: $ }), x.set(p, 1)) : x.set(p, m + 1);
          }
        }
      }
    };
    return f(qr(us)), Cn.add(f), () => {
      for (var d of c) for (const x of [t, document]) {
        var _ = yt.get(x), p = _.get(d);
        --p == 0 ? (x.removeEventListener(d, An), _.delete(d), _.size === 0 && yt.delete(x)) : _.set(d, p);
      }
      if (Cn.delete(f), v !== n) {
        var $;
        ($ = v.parentNode) === null || $ === void 0 || $.removeChild(v);
      }
    };
  });
  return on.set(u, h), u;
}
var on = /* @__PURE__ */ new WeakMap();
function $s(e, t) {
  const n = on.get(e);
  return n ? (on.delete(e), n(t)) : Promise.resolve();
}
function xs(e) {
  j === null && fi("onMount"), Ge && j.l !== null ? Ss(j).m.push(e) : nn(() => {
    const t = ht(e);
    if (typeof t == "function") return t;
  });
}
function Ss(e) {
  var t, n = e.l;
  return (t = n.u) !== null && t !== void 0 ? t : n.u = {
    a: [],
    b: [],
    m: []
  };
}
function Es(e, t, n = !1, r = !1, i = !1, s = !1) {
  var o = e, a = "";
  if (n) {
    var u = e;
    z && (o = ge(/* @__PURE__ */ Se(u)));
  }
  ns(() => {
    var h, v = b;
    if (a === (a = (h = t()) !== null && h !== void 0 ? h : "")) {
      z && Et();
      return;
    }
    if (n && !z) {
      v.nodes = null, u.innerHTML = a, a !== "" && Ue(/* @__PURE__ */ Se(u), u.lastChild);
      return;
    }
    if (v.nodes !== null && (br(v.nodes.start, v.nodes.end), v.nodes = null), a !== "") {
      if (z) {
        for (var c = O.data, f = Et(), d = f; f !== null && (f.nodeType !== 8 || f.data !== ""); )
          d = f, f = /* @__PURE__ */ we(f);
        if (f === null)
          throw Nt(), me;
        Ue(O, d), o = ge(f);
        return;
      }
      var _ = mr(r ? "svg" : i ? "math" : "template", r ? Fr : i ? Dr : void 0);
      _.innerHTML = a;
      var p = r || i ? _ : _.content;
      if (Ue(/* @__PURE__ */ Se(p), p.lastChild), r || i) for (; /* @__PURE__ */ Se(p); ) o.before(/* @__PURE__ */ Se(p));
      else o.before(p);
    }
  });
}
var Nr, Fe = /* @__PURE__ */ new WeakMap(), Rt = /* @__PURE__ */ new WeakMap(), Kt = /* @__PURE__ */ new WeakMap(), In = /* @__PURE__ */ new WeakSet(), Br = class {
  constructor(e) {
    cn(this, In), M(this, Fe, /* @__PURE__ */ new WeakMap()), M(this, Rt, void 0), M(this, Kt, void 0), y(Kt, this, e);
  }
  observe(e, t) {
    var n = l(Fe, this).get(e) || /* @__PURE__ */ new Set();
    return n.add(t), l(Fe, this).set(e, n), g(In, this, Ms).call(this).observe(e, l(Kt, this)), () => {
      var r = l(Fe, this).get(e);
      r.delete(t), r.size === 0 && (l(Fe, this).delete(e), l(Rt, this).unobserve(e));
    };
  }
};
Nr = Br;
function Ms() {
  var e;
  return (e = l(Rt, this)) !== null && e !== void 0 ? e : y(Rt, this, new ResizeObserver((t) => {
    for (var n of t) {
      Nr.entries.set(n.target, n);
      for (var r of l(Fe, this).get(n.target) || []) r(n);
    }
  }));
}
T(Br, "entries", /* @__PURE__ */ new WeakMap());
function Ts(e = !1) {
  const t = j, n = t.l.u;
  if (!n) return;
  let r = () => Ar(t.s);
  if (e) {
    let i = 0, s = {};
    const o = /* @__PURE__ */ ot(() => {
      let a = !1;
      const u = t.s;
      for (const h in u) u[h] !== s[h] && (s[h] = u[h], a = !0);
      return a && i++, i;
    });
    r = () => R(o);
  }
  n.b.length && Xi(() => {
    Ln(t, r), Xt(n.b);
  }), nn(() => {
    const i = ht(() => n.m.map(Xr));
    return () => {
      for (const s of i) typeof s == "function" && s();
    };
  }), n.a.length && nn(() => {
    Ln(t, r), Xt(n.a);
  });
}
function Ln(e, t) {
  if (e.l.s) for (const n of e.l.s) R(n);
  t();
}
var bt = !1;
function Cs(e) {
  var t = bt;
  try {
    return bt = !1, [e(), bt];
  } finally {
    bt = t;
  }
}
function As(e, t, n, r) {
  var i = !Ge || (n & 2) !== 0, s = (n & 8) !== 0, o = (n & 16) !== 0, a = r, u = !0, h = void 0, v = () => {
    if (o && i) {
      var E;
      return (E = h) !== null && E !== void 0 || (h = /* @__PURE__ */ ot(r)), R(h);
    }
    return u && (u = !1, a = o ? ht(r) : r), a;
  };
  let c;
  if (s) {
    var f, d, _ = He in e || Un in e;
    c = (f = (d = Te(e, t)) === null || d === void 0 ? void 0 : d.set) !== null && f !== void 0 ? f : _ && t in e ? (E) => e[t] = E : void 0;
  }
  var p, $ = !1;
  s ? [p, $] = Cs(() => e[t]) : p = e[t], p === void 0 && r !== void 0 && (p = v(), c && (i && gi(t), c(p)));
  var x;
  if (i ? x = () => {
    var E = e[t];
    return E === void 0 ? v() : (u = !0, E);
  } : x = () => {
    var E = e[t];
    return E !== void 0 && (a = void 0), E === void 0 ? a : E;
  }, i && (n & 4) === 0) return x;
  if (c) {
    var m = e.$$legacy;
    return (function(E, B) {
      return arguments.length > 0 ? ((!i || !B || m || $) && c(B ? x() : E), E) : x();
    });
  }
  var S = !1, N = ((n & 1) !== 0 ? ot : Qn)(() => (S = !1, x()));
  s && R(N);
  var X = b;
  return (function(E, B) {
    if (arguments.length > 0) {
      const q = B ? R(N) : i && s ? De(E) : E;
      return se(N, q), S = !0, a !== void 0 && (a = q), E;
    }
    return ce && S || (X.f & 16384) !== 0 ? N.v : R(N);
  });
}
function Os(e) {
  return new js(e);
}
var ke = /* @__PURE__ */ new WeakMap(), ie = /* @__PURE__ */ new WeakMap(), js = class {
  constructor(e) {
    var t, n;
    M(this, ke, void 0), M(this, ie, void 0);
    var r = /* @__PURE__ */ new Map(), i = (o, a) => {
      var u = /* @__PURE__ */ vr(a, !1, !1);
      return r.set(o, u), u;
    };
    const s = new Proxy(qe(qe({}, e.props || {}), {}, { $$events: {} }), {
      get(o, a) {
        var u;
        return R((u = r.get(a)) !== null && u !== void 0 ? u : i(a, Reflect.get(o, a)));
      },
      has(o, a) {
        var u;
        return a === Un ? !0 : (R((u = r.get(a)) !== null && u !== void 0 ? u : i(a, Reflect.get(o, a))), Reflect.has(o, a));
      },
      set(o, a, u) {
        var h;
        return se((h = r.get(a)) !== null && h !== void 0 ? h : i(a, u), u), Reflect.set(o, a, u);
      }
    });
    y(ie, this, (e.hydrate ? ks : Lr)(e.component, {
      target: e.target,
      anchor: e.anchor,
      props: s,
      context: e.context,
      intro: (t = e.intro) !== null && t !== void 0 ? t : !1,
      recover: e.recover,
      transformError: e.transformError
    })), !Ye && (!(!(e == null || (n = e.props) === null || n === void 0) && n.$$host) || e.sync === !1) && fn(), y(ke, this, s.$$events);
    for (const o of Object.keys(l(ie, this)))
      o === "$set" || o === "$destroy" || o === "$on" || st(this, o, {
        get() {
          return l(ie, this)[o];
        },
        set(a) {
          l(ie, this)[o] = a;
        },
        enumerable: !0
      });
    l(ie, this).$set = (o) => {
      Object.assign(s, o);
    }, l(ie, this).$destroy = () => {
      $s(l(ie, this));
    };
  }
  $set(e) {
    l(ie, this).$set(e);
  }
  $on(e, t) {
    l(ke, this)[e] = l(ke, this)[e] || [];
    const n = (...r) => t.call(this, ...r);
    return l(ke, this)[e].push(n), () => {
      l(ke, this)[e] = l(ke, this)[e].filter((r) => r !== n);
    };
  }
  $destroy() {
    l(ie, this).$destroy();
  }
}, zr;
typeof HTMLElement == "function" && (zr = class extends HTMLElement {
  constructor(e, t, n) {
    super(), T(this, "$$ctor", void 0), T(this, "$$s", void 0), T(this, "$$c", void 0), T(this, "$$cn", !1), T(this, "$$d", {}), T(this, "$$r", !1), T(this, "$$p_d", {}), T(this, "$$l", {}), T(this, "$$l_u", /* @__PURE__ */ new Map()), T(this, "$$me", void 0), T(this, "$$shadowRoot", null), this.$$ctor = e, this.$$s = t, n && (this.$$shadowRoot = this.attachShadow(n));
  }
  addEventListener(e, t, n) {
    if (this.$$l[e] = this.$$l[e] || [], this.$$l[e].push(t), this.$$c) {
      const r = this.$$c.$on(e, t);
      this.$$l_u.set(t, r);
    }
    super.addEventListener(e, t, n);
  }
  removeEventListener(e, t, n) {
    if (super.removeEventListener(e, t, n), this.$$c) {
      const r = this.$$l_u.get(t);
      r && (r(), this.$$l_u.delete(t));
    }
  }
  async connectedCallback() {
    if (this.$$cn = !0, !this.$$c) {
      let e = function(r) {
        return (i) => {
          const s = mr("slot");
          r !== "default" && (s.name = r), Or(i, s);
        };
      };
      if (await Promise.resolve(), !this.$$cn || this.$$c) return;
      const t = {}, n = Ps(this);
      for (const r of this.$$s) r in n && (r === "default" && !this.$$d.children ? (this.$$d.children = e(r), t.default = !0) : t[r] = e(r));
      for (const r of this.attributes) {
        const i = this.$$g_p(r.name);
        i in this.$$d || (this.$$d[i] = $t(i, r.value, this.$$p_d, "toProp"));
      }
      for (const r in this.$$p_d) !(r in this.$$d) && this[r] !== void 0 && (this.$$d[r] = this[r], delete this[r]);
      this.$$c = Os({
        component: this.$$ctor,
        target: this.$$shadowRoot || this,
        props: qe(qe({}, this.$$d), {}, {
          $$slots: t,
          $$host: this
        })
      }), this.$$me = Zi(() => {
        Wt(() => {
          this.$$r = !0;
          for (const i of xt(this.$$c)) {
            var r;
            if (!(!((r = this.$$p_d[i]) === null || r === void 0) && r.reflect)) continue;
            this.$$d[i] = this.$$c[i];
            const s = $t(i, this.$$d[i], this.$$p_d, "toAttribute");
            s == null ? this.removeAttribute(this.$$p_d[i].attribute || i) : this.setAttribute(this.$$p_d[i].attribute || i, s);
          }
          this.$$r = !1;
        });
      });
      for (const r in this.$$l) for (const i of this.$$l[r]) {
        const s = this.$$c.$on(r, i);
        this.$$l_u.set(i, s);
      }
      this.$$l = {};
    }
  }
  attributeChangedCallback(e, t, n) {
    var r;
    this.$$r || (e = this.$$g_p(e), this.$$d[e] = $t(e, n, this.$$p_d, "toProp"), (r = this.$$c) === null || r === void 0 || r.$set({ [e]: this.$$d[e] }));
  }
  disconnectedCallback() {
    this.$$cn = !1, Promise.resolve().then(() => {
      !this.$$cn && this.$$c && (this.$$c.$destroy(), this.$$me(), this.$$c = void 0);
    });
  }
  $$g_p(e) {
    return xt(this.$$p_d).find((t) => this.$$p_d[t].attribute === e || !this.$$p_d[t].attribute && t.toLowerCase() === e) || e;
  }
});
function $t(e, t, n, r) {
  var i;
  const s = (i = n[e]) === null || i === void 0 ? void 0 : i.type;
  if (t = s === "Boolean" && typeof t != "boolean" ? t != null : t, !r || !n[e]) return t;
  if (r === "toAttribute") switch (s) {
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
function Ps(e) {
  const t = {};
  return e.childNodes.forEach((n) => {
    t[n.slot || "default"] = !0;
  }), t;
}
function Is(e, t, n, r, i, s) {
  let o = class extends zr {
    constructor() {
      super(e, n, i), this.$$p_d = t;
    }
    static get observedAttributes() {
      return xt(t).map((a) => (t[a].attribute || a).toLowerCase());
    }
  };
  return xt(t).forEach((a) => {
    st(o.prototype, a, {
      get() {
        return this.$$c && a in this.$$c ? this.$$c[a] : this.$$d[a];
      },
      set(u) {
        u = $t(a, u, t), this.$$d[a] = u;
        var h = this.$$c;
        if (h) {
          var v;
          !((v = Te(h, a)) === null || v === void 0) && v.get ? h[a] = u : h.$set({ [a]: u });
        }
      }
    });
  }), r.forEach((a) => {
    st(o.prototype, a, { get() {
      var u;
      return (u = this.$$c) === null || u === void 0 ? void 0 : u[a];
    } });
  }), s && (o = s(o)), e.element = o, o;
}
var Ls = `

<div id='comment-widget-section' class='comment-widget' preferred='yes'>
    <div id='comment-widget'>
    <h3 id="comments-title">
    <span id="comment-count">0</span> Comments </h3>
 
    <div id='comment-rules' style='
  margin-bottom: 20px;
  padding: 14px;
  background: rgba(255, 0, 0, 0.08);
  border: 1px solid rgba(255, 80, 80, 0.25);
  border-radius: 10px;
  font-size: 0.95em;
  color: #ffe5e5;
  text-align: center;
  line-height: 1.5;
  backdrop-filter: blur(6px);
  box-shadow: 
    0 0 12px rgba(255,0,0,0.12),
    inset 0 0 12px rgba(255,0,0,0.05);
'>
  <span style="
    font-size: 1.05em;
    font-weight: 800;
    color: #ffb3b3;
  ">
    Yang tidak komentar = IMPOTENT
  </span>

  <br>

  <span style="
    color: #ff9b9b;
    font-size: 0.9em;
  ">
    Buktikan kalau kamu masih hidup
  </span>
</div>

<!-- EMAIL AUTH MODAL -->
<div id="email-auth-modal" class="email-modal">
  <div class="email-modal-card">
    <div class="email-modal-header">

      <h2 id="modal-title">
        Sign In
      </h2>

      <p>
        Sign in or create a new account
      </p>

    </div>

    <input
  type="email"
  id="email-input"
  placeholder="Email Address"
  autocomplete="username">

    <div class="password-wrapper">

      <input
        type="password"
        id="password-input"
        placeholder="Password">

       <button
    type="button"
    id="toggle-password"
    aria-label="Toggle password visibility">

    <svg id="eye-closed"
         xmlns="http://www.w3.org/2000/svg"
         width="20"
         height="20"
         viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         stroke-width="2"
         stroke-linecap="round"
         stroke-linejoin="round"
         style="display:none;">

      <path d="M1 12S5 5 12 5s11 7 11 7-4 7-11 7S1 12 1 12"></path>
      <circle cx="12" cy="12" r="3"></circle>

    </svg>

    <svg id="eye-open"
         xmlns="http://www.w3.org/2000/svg"
         width="20"
         height="20"
         viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         stroke-width="2"
         stroke-linecap="round"
         stroke-linejoin="round">

      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C5 20 1 12 1 12A21.83 21.83 0 0 1 6.06 6.06"></path>
      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4C19 4 23 12 23 12A21.82 21.82 0 0 1 20.77 15.13"></path>
      <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
  </button>
    </div>

    <div id="email-error"></div>
    <button id="email-auth-submit">
      Sign In
    </button>

    <button id="toggle-auth-mode">
      Don't have an account? Sign Up
    </button>

    <button
      class="email-cancel-btn"
      onclick="closeEmailModal()">
      Close
    </button>
  </div>
</div>

    <div id='auth-section'>
      <button id="email-login-btn" 
              onclick="openEmailAuthModal()"
              title="Sign in with Email"
              style="background: transparent; border: none; padding: 0; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
          <polyline points="22,6 12,13 2,6"></polyline>
        </svg>
      </button>

      <button id='google-signin' onclick='signInWithGoogle()' title='Sign in with Google'>
        <svg width="32" height="32" viewbox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
      </button>

      <button id='github-signin' onclick='signInWithGitHub()' title='Sign in with GitHub'>
        <svg width="32" height="32" viewbox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 2px white);">
          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.605-3.369-1.343-3.369-1.343-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.091-.647.35-1.087.636-1.337-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.026 1.592 1.026 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A9.995 9.995 0 0022 12c0-5.523-4.477-10-10-10z" fill="#000000"/>
       </svg>
      </button>

      <button id='facebook-signin' onclick='signInWithFacebook()' title='Sign in with Facebook'>
        <svg width="32" height="32" viewbox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.989 4.388 10.954 10.125 11.854v-8.385H7.078V12h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.234 2.686.234v2.953H15.83c-1.49 0-1.956.925-1.956 1.874V12h3.328l-.532 3.469h-2.796v8.385C19.612 22.954 24 17.989 24 12z" fill="#1877F2"/>
        </svg>
      </button>

      <button id='x-signin' onclick='signInWithX()' title='Sign in with X'>
        <svg width="32" height="32" viewbox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 2px white);">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="#000000"/>
        </svg>
      </button>


      <span id="user-name" style="display:none;"></span>
      <div id="user-info" style="display:none;">
  
  <img 
    id="user-avatar" 
    src="" 
    alt="User Avatar"
  />

  <div class="user-action-icons">

 <!-- t Message -->
<button class="user-action-btn" title="Direct Messages" onclick="openMikorokuDmInbox()">
  <svg viewBox="0 0 24 24" fill="none">
    <path
      d="M21 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v9Z"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>

  <span id="dm-unread-badge"></span>
</button>

    <!-- NOTIFICATION -->
    <button class="user-action-btn" onclick="openMikorokuNotifications()" title="Notifications">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22zm7-6V11a7 7 0 1 0-14 0v5l-2 2v1h18v-1l-2-2z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"/>
      </svg>

      <span id="reply-badge" style="display:none"></span>
    </button>

    <!-- USER SETTINGS -->
    <a class="user-action-btn" href="/settings" title="User Settings" aria-label="User Settings">
  <svg viewBox="0 0 24 24" fill="none">
    
    <path
      d="M12 3L14.2 5.2L17.3 4.7L18.3 7.7L21 9L20 12L21 15L18.3 16.3L17.3 19.3L14.2 18.8L12 21L9.8 18.8L6.7 19.3L5.7 16.3L3 15L4 12L3 9L5.7 7.7L6.7 4.7L9.8 5.2L12 3Z"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linejoin="round"
    />

    <circle
      cx="12"
      cy="12"
      r="3"
      stroke="currentColor"
      stroke-width="1.7"
    />
    
  </svg>
</a>

    <!-- SIGN OUT -->
    <button id="google-signout" class="user-action-btn signout-btn" onclick="signOut()" title="Sign Out">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"/>

        <path d="M16 17l5-5-5-5"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"/>

        <path d="M21 12H9"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"/>
      </svg>
    </button>
    </div>
   </div>
  </div>

    <div id='comment-form-container'>
      <form id='comment-form'>
  <div class="input-lock-wrapper">
  <input type="text" id="author" placeholder="Your Name" maxlength="50"/>

  <span class="lock-icon">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 8V7a5 5 0 0 0-10 0v1H5v13h14V8h-2zm-8 0V7a3 3 0 0 1 6 0v1H9z"/>
  </svg>
</span>

  <div class="custom-tooltip">
    Your display name can only be changed in User Settings
  </div>
</div>
  
  <div class="comment-input-wrapper">
    <textarea 
      id='comment-text' 
      placeholder='Write your comment...' 
      required 
      maxlength='1000'></textarea>

    <div class="inside-toolbar">

  <!-- UPLOAD -->
  <label for="comment-image" class="upload-inside-btn" title="Upload image">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  </label>

  <!-- BOLD -->
  <button type="button" class="md-btn" data-md="bold" title="Bold">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
      <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
    </svg>
  </button>

  <!-- ITALIC -->
  <button type="button" class="md-btn" data-md="italic" title="Italic">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="19" y1="4" x2="10" y2="4"></line>
      <line x1="14" y1="20" x2="5" y2="20"></line>
      <line x1="15" y1="4" x2="9" y2="20"></line>
    </svg>
  </button>

  <!-- SPOILER -->
  <button type="button" class="md-btn" data-md="spoiler" title="Spoiler">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17 12a5 5 0 0 1-10 0 5 5 0 0 1 10 0z"></path>
      <path d="M12 2v2"></path><path d="M12 20v2"></path>
    </svg>
  </button>

  <!-- LINK -->
  <button type="button" class="md-btn" data-md="link" title="Insert Link">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
    </svg>
  </button>

  <!-- CODE -->
  <button type="button" class="md-btn" data-md="code" title="Code">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="16 18 22 12 16 6"></polyline>
      <polyline points="8 6 2 12 8 18"></polyline>
    </svg>
  </button>

  <!-- QUOTE -->
  <button type="button" class="md-btn" data-md="quote" title="Quote">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  </button>

 <!-- MENTION BUTTON -->
<button type="button" class="md-btn" data-md="mention" title="Mention User (@)">
  <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" fill="none">
    <text x="12" y="17.5" font-size="19" text-anchor="middle" fill="currentColor" font-weight="700" stroke="none">@</text>
  </svg>
</button>

  <button type="submit" class="post-comment-inside">
    Post Comment
  </button>
  </div>

<input
  type='file'
  id='comment-image'
  accept='image/jpeg,image/png,image/gif'
  hidden
/>
  </div>

  <div id='comment-preview' style='display:none; margin-top:12px; position:relative;'>
  <img id='comment-preview-img' 
       style='max-width:400px; max-height:400px; width:100%; height:auto; border-radius:8px;'/>
  
  <button type='button' id='remove-comment-preview' 
          style='position:absolute; top:-10px; right:-10px; width:28px; height:28px; 
                 background:#ff4444; color:white; border:none; border-radius:50%; 
                 font-size:18px; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.3); 
                 display:flex; align-items:center; justify-content:center; z-index:10;'>
    ×
  </button>
</div>

</form>

<!-- SORT BAR -->
<div class="comment-sort-bar">
  
  <button class="sort-btn active" data-sort="newest" title="Terbaru">
    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3v18"></path>
      <path d="M5 10l7-7 7 7"></path>
    </svg>
  </button>

  <button class="sort-btn" data-sort="oldest" title="Terlama">
    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 21V3"></path>
      <path d="M19 14l-7 7-7-7"></path>
    </svg>
  </button>

  <button class="sort-btn" data-sort="hot" title="Hot">
    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2s4 4 4 8a4 4 0 1 1-8 0c0-4 4-8 4-8z"/>
      <path d="M12 14a3 3 0 0 1 3 3c0 2-3 5-3 5s-3-3-3-5a3 3 0 0 1 3-3z"/>
    </svg>
  </button>

</div>

   

    <div id='comments-list' aria-busy="true">
      <div id="comment-loading" class="comment-loading-skeleton-list" aria-label="Loading comments" aria-live="polite">
        <article class="comment-loading-skeleton-card" aria-hidden="true">
          <div class="comment-loading-skeleton-header">
            <span class="comment-loading-skeleton-avatar"></span>
            <span class="comment-loading-skeleton-line comment-loading-skeleton-name"></span>
            <span class="comment-loading-skeleton-line comment-loading-skeleton-date"></span>
          </div>
          <span class="comment-loading-skeleton-line comment-loading-skeleton-text"></span>
          <span class="comment-loading-skeleton-line comment-loading-skeleton-text comment-loading-skeleton-text-short"></span>
        </article>
        <article class="comment-loading-skeleton-card" aria-hidden="true">
          <div class="comment-loading-skeleton-header">
            <span class="comment-loading-skeleton-avatar"></span>
            <span class="comment-loading-skeleton-line comment-loading-skeleton-name"></span>
            <span class="comment-loading-skeleton-line comment-loading-skeleton-date"></span>
          </div>
          <span class="comment-loading-skeleton-line comment-loading-skeleton-text"></span>
          <span class="comment-loading-skeleton-line comment-loading-skeleton-text comment-loading-skeleton-text-short"></span>
        </article>
        <article class="comment-loading-skeleton-card" aria-hidden="true">
          <div class="comment-loading-skeleton-header">
            <span class="comment-loading-skeleton-avatar"></span>
            <span class="comment-loading-skeleton-line comment-loading-skeleton-name"></span>
            <span class="comment-loading-skeleton-line comment-loading-skeleton-date"></span>
          </div>
          <span class="comment-loading-skeleton-line comment-loading-skeleton-text"></span>
          <span class="comment-loading-skeleton-line comment-loading-skeleton-text comment-loading-skeleton-text-short"></span>
        </article>
      </div>
    </div>

    <div id="load-more-wrap" style="display:none; justify-content:center; margin:16px 0;">
      <button id="load-more-btn" type="button" onclick="loadMoreComments()" style="
        padding:10px 20px; border-radius:10px; border:1px solid var(--border);
        background:rgba(0,0,0,0.16) !important; color:var(--text); cursor:pointer; font-weight:600;
      ">
        <span class="load-more-label">Show all comments</span>
      </button>
    </div>
    <div id="load-more-end" style="display:none; text-align:center; color:var(--muted); font-size:0.85em; margin:12px 0;">
      All comments are displayed
    </div>


  <!-- Firebase SDK -->
  
  
  
  
  
  `;
function Rs(e, t) {
  Yn(t, !1);
  let n = As(t, "pageId", 12, "home");
  const r = "/widgets/comment-runtime.js?v=firestore-persistence-1", i = {
    dm: "/widgets/comment-dm.css",
    report: "/widgets/comment-report.css",
    settings: "/widgets/comment-settings.css",
    effects: "/widgets/comment-effects.css?v=avatar-frame-fit-2"
  }, s = [
    ["https://cdn.jsdelivr.net/npm/dompurify@3.2.7/dist/purify.min.js", () => !!window.DOMPurify],
    ["https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js", () => !!window.firebase],
    ["https://www.gstatic.com/firebasejs/10.14.0/firebase-auth-compat.js", () => {
      var m;
      return !!(!((m = window.firebase) === null || m === void 0) && m.auth);
    }],
    ["https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore-compat.js", () => {
      var m;
      return !!(!((m = window.firebase) === null || m === void 0) && m.firestore);
    }],
    ["https://cdn.jsdelivr.net/npm/md5@2.3.0/dist/md5.min.js", () => !!window.md5]
  ];
  let o = /* @__PURE__ */ vr(!1);
  const a = /* @__PURE__ */ new Map();
  let u = null;
  function h() {
    return u || (u = fetch(r).then((m) => {
      if (!m.ok) throw new Error(`Failed to load ${r}: ${m.status}`);
      return m.text();
    }), u);
  }
  async function v() {
    const m = window.firebase.apps.find((N) => N.name === "[DEFAULT]") || window.firebase.initializeApp({
      apiKey: "AIzaSyCxufJubuS95zQnvctINvzj-H8WSIgsse4",
      authDomain: "widget-comment.firebaseapp.com",
      projectId: "widget-comment",
      storageBucket: "widget-comment.firebasestorage.app",
      messagingSenderId: "249700505242",
      appId: "1:249700505242:web:dab240af09caf30ad7f123"
    });
    if (m.options.projectId !== "widget-comment") throw new Error("The default Firebase app must use the shared comment authentication project.");
    const S = await import(
      /* @vite-ignore */
      "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js"
    );
    try {
      S.initializeFirestore(m._delegate, { localCache: S.persistentLocalCache({ tabManager: S.persistentMultipleTabManager() }) });
    } catch (N) {
      console.warn("Comment Firestore persistent cache unavailable; using the default Firestore cache.", N);
    }
  }
  function c(m) {
    if (document.head.querySelector(`link[href="${m}"]`)) return;
    const S = document.createElement("link");
    S.rel = "stylesheet", S.href = m, S.dataset.mikorokuCommentStyle = "", document.head.appendChild(S);
  }
  function f(m) {
    c(i[m]);
  }
  function d(m, S) {
    if (S()) return Promise.resolve();
    const N = a.get(m);
    if (N) return N;
    const X = new URL(m, document.baseURI).href, E = Array.from(document.scripts).find((q) => q.src === X), B = new Promise((q, Re) => {
      if (E) {
        if (E.dataset.loaded === "true") {
          Re(/* @__PURE__ */ new Error(`Script loaded without initializing its library: ${m}`));
          return;
        }
        E.addEventListener("load", () => {
          S() ? (E.dataset.loaded = "true", q()) : Re(/* @__PURE__ */ new Error(`Script loaded without initializing its library: ${m}`));
        }, { once: !0 }), E.addEventListener("error", () => {
          E.remove(), Re(/* @__PURE__ */ new Error(`Failed to load ${m}`));
        }, { once: !0 });
        return;
      }
      const ye = document.createElement("script");
      ye.src = m, ye.async = !1, ye.addEventListener("load", () => {
        ye.dataset.loaded = "true", q();
      }, { once: !0 }), ye.addEventListener("error", () => {
        ye.remove(), Re(/* @__PURE__ */ new Error(`Failed to load ${m}`));
      }, { once: !0 }), document.head.appendChild(ye);
    });
    return a.set(m, B), B.catch(() => {
      a.get(m) === B && a.delete(m);
    }), B;
  }
  async function _() {
    var m, S;
    const N = h(), [X, E, B] = s;
    if (await Promise.all([d(X[0], X[1]), d(B[0], B[1])]), await d(E[0], E[1]), await Promise.all(s.slice(2, 4).map(([q, Re]) => d(q, Re))), await v(), !R(o)) {
      const q = document.createElement("script");
      q.textContent = await N, document.body.appendChild(q), se(o, !0);
    }
    (m = (S = window).setCommentCommunityPageId) === null || m === void 0 || m.call(S, n() || "home");
  }
  xs(() => {
    c("/widgets/comment-widget.css?v=reply-buttons-6"), window.loadCommentFeatureStyles = f;
    const m = "requestIdleCallback" in window ? window.requestIdleCallback(() => f("effects"), { timeout: 2500 }) : window.setTimeout(() => f("effects"), 2500);
    return _().catch((S) => {
      console.error("Comment widget failed to initialize.", S);
    }), () => {
      typeof m == "number" && window.clearTimeout(m), window.loadCommentFeatureStyles === f && delete window.loadCommentFeatureStyles;
    };
  }), Qi(() => (R(o), Ar(n())), () => {
    if (R(o) && n()) {
      var m, S;
      (m = (S = window).setCommentCommunityPageId) === null || m === void 0 || m.call(S, n());
    }
  }), es();
  var p = {
    get pageId() {
      return n();
    },
    set pageId(m) {
      n(m), fn();
    }
  };
  Ts();
  var $ = cs(), x = Ui($);
  return Es(x, () => Ls), Or(e, $), Gn(p);
}
customElements.define("mikoroku-comment-widget", Is(Rs, { pageId: {
  attribute: "page-id",
  type: "String"
} }, [], []));
export {
  Rs as default
};
