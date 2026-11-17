if (typeof window != "undefined") {
  var _n, Dt, mn, Ft;
  ((Dt = (_n = (Ft = (mn = window).__svelte) !== null && Ft !== void 0 ? Ft : mn.__svelte = {}).v) !== null && Dt !== void 0 ? Dt : _n.v = /* @__PURE__ */ new Set()).add("5");
}
var Ve = !1, Ye = !1;
function Wr() {
  Ye = !0;
}
Wr();
var me = {}, L = /* @__PURE__ */ Symbol("uninitialized");
var zr = "http://www.w3.org/2000/svg", Dr = "http://www.w3.org/1998/Math/MathML", Fr = Array.isArray, Hr = Array.prototype.indexOf, rt = Array.prototype.includes, Ur = Array.from, $t = Object.keys, it = Object.defineProperty, Te = Object.getOwnPropertyDescriptor, qr = Object.getOwnPropertyDescriptors, Vr = Object.prototype, Yr = Array.prototype, In = Object.getPrototypeOf, gn = Object.isExtensible, Gr = () => {
};
function Kr(e) {
  return e();
}
function Kt(e) {
  for (var t = 0; t < e.length; t++) e[t]();
}
function Rn() {
  var e, t;
  return {
    promise: new Promise((n, r) => {
      e = n, t = r;
    }),
    resolve: e,
    reject: t
  };
}
function st(e) {
  "@babel/helpers - typeof";
  return st = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
    return typeof t;
  } : function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, st(e);
}
function Xr(e, t) {
  if (st(e) != "object" || !e) return e;
  var n = e[Symbol.toPrimitive];
  if (n !== void 0) {
    var r = n.call(e, t || "default");
    if (st(r) != "object") return r;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
function Zr(e) {
  var t = Xr(e, "string");
  return st(t) == "symbol" ? t : t + "";
}
function M(e, t, n) {
  return (t = Zr(t)) in e ? Object.defineProperty(e, t, {
    value: n,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : e[t] = n, e;
}
var Ht, Rs = 1 << 24, Y = 1024, U = 2048, fe = 4096, Nn = 8192, Bn = 16384, Wn = 32768, Xt = 1 << 25, zn = 65536, Ns = 1 << 17, Bs = 1 << 18, Ge = 1 << 19, Dn = 1 << 20, wn = 1 << 21, Jr = 1 << 22, xt = 1 << 23, Fe = /* @__PURE__ */ Symbol("$state"), Fn = /* @__PURE__ */ Symbol("component"), Hn = /* @__PURE__ */ Symbol("legacy props"), Qr = /* @__PURE__ */ Symbol("proxy path"), ei = /* @__PURE__ */ Symbol("attributes"), ti = /* @__PURE__ */ Symbol("class"), ni = /* @__PURE__ */ Symbol("style"), ri = /* @__PURE__ */ Symbol("text"), ct = new class extends Error {
  constructor(...t) {
    super(...t), M(this, "name", "StaleReactionError"), M(this, "message", "The reaction that called `getAbortSignal()` was re-run or destroyed");
  }
}(), zs = !!(!((Ht = globalThis.document) === null || Ht === void 0) && Ht.contentType) && /* @__PURE__ */ globalThis.document.contentType.includes("xml");
function ii() {
  console.warn("https://svelte.dev/e/derived_inert");
}
function Rt(e) {
  console.warn("https://svelte.dev/e/hydration_mismatch");
}
function si() {
  console.warn("https://svelte.dev/e/svelte_boundary_reset_noop");
}
var W = !1;
function ht(e) {
  W = e;
}
var A;
function ge(e) {
  if (e === null)
    throw Rt(), me;
  return A = e;
}
function St() {
  return ge(/* @__PURE__ */ we(A));
}
function oi(e = 1) {
  if (W) {
    for (var t = e, n = A; t--; ) n = /* @__PURE__ */ we(n);
    A = n;
  }
}
function ai(e = !0) {
  for (var t = 0, n = A; ; ) {
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
function li(e) {
  if (!e || e.nodeType !== 8)
    throw Rt(), me;
  return e.data;
}
function Un(e) {
  return e === this.v;
}
function ui(e, t) {
  return e != e ? t == t : e !== t || e !== null && typeof e == "object" || typeof e == "function";
}
function qn(e) {
  return !ui(e, this.v);
}
function ci(e) {
  throw new Error("https://svelte.dev/e/lifecycle_outside_component");
}
function fi() {
  throw new Error("https://svelte.dev/e/async_derived_orphan");
}
function di(e) {
  throw new Error("https://svelte.dev/e/effect_in_teardown");
}
function vi() {
  throw new Error("https://svelte.dev/e/effect_in_unowned_derived");
}
function hi(e) {
  throw new Error("https://svelte.dev/e/effect_orphan");
}
function pi() {
  throw new Error("https://svelte.dev/e/effect_update_depth_exceeded");
}
function _i() {
  throw new Error("https://svelte.dev/e/hydration_failed");
}
function mi(e) {
  throw new Error("https://svelte.dev/e/props_invalid_value");
}
function gi() {
  throw new Error("https://svelte.dev/e/state_descriptors_fixed");
}
function wi() {
  throw new Error("https://svelte.dev/e/state_prototype_fixed");
}
function yi() {
  throw new Error("https://svelte.dev/e/state_unsafe_mutation");
}
function bi() {
  throw new Error("https://svelte.dev/e/svelte_boundary_reset_onerror");
}
function yn(e, t) {
  return e.label = t, ki(e.v, t), e;
}
function ki(e, t) {
  var n;
  return e == null || (n = e[Qr]) === null || n === void 0 || n.call(e, t), e;
}
function bn(e, t) {
  var n = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    t && (r = r.filter(function(i) {
      return Object.getOwnPropertyDescriptor(e, i).enumerable;
    })), n.push.apply(n, r);
  }
  return n;
}
function Ue(e) {
  for (var t = 1; t < arguments.length; t++) {
    var n = arguments[t] != null ? arguments[t] : {};
    t % 2 ? bn(Object(n), !0).forEach(function(r) {
      M(e, r, n[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : bn(Object(n)).forEach(function(r) {
      Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(n, r));
    });
  }
  return e;
}
var O = null;
function qe(e) {
  O = e;
}
function Vn(e, t = !1, n) {
  O = {
    p: O,
    i: !1,
    c: null,
    e: null,
    s: e,
    x: null,
    r: b,
    l: Ye && !t ? {
      s: null,
      u: null,
      $: []
    } : null
  };
}
function Yn(e) {
  var t = O, n = t.e;
  if (n !== null) {
    t.e = null;
    for (var r of n) gr(r);
  }
  if (e !== void 0 && (t.x = e), t.i = !0, O = t.p, 0)
    var i;
  return Gn(e);
}
function Gn(e = {}) {
  return it(e, Fn, { value: !0 }), e;
}
function ft() {
  return !Ye || O !== null && O.l === null;
}
var Ee = [];
function Kn() {
  var e = Ee;
  Ee = [], Kt(e);
}
function je(e) {
  if (Ee.length === 0 && !tt) {
    var t = Ee;
    queueMicrotask(() => {
      t === Ee && Kn();
    });
  }
  Ee.push(e);
}
function $i() {
  for (; Ee.length > 0; ) Kn();
}
var xi = ~(U | fe | Y);
function P(e, t) {
  e.f = e.f & xi | t;
}
function an(e) {
  (e.f & 512) !== 0 || e.deps === null ? P(e, Y) : P(e, fe);
}
function Xn(e, t) {
  (e.f & 2048) !== 0 ? t.set(e, U) : (e.f & 4096) !== 0 && t.get(e) !== 2048 && t.set(e, fe), P(e, Y);
}
function Nt(e) {
  var t = k, n = b;
  G(null), K(null);
  try {
    return e();
  } finally {
    G(t), K(n);
  }
}
function Si(e, t) {
  this.v = e, this.k = t;
}
function pt(e) {
  var t, n;
  function r(s, a) {
    try {
      var o = e[s](a), u = o.value, h = u instanceof Si;
      Promise.resolve(h ? u.v : u).then(function(v) {
        if (h) {
          var c = s === "return" ? "return" : "next";
          if (!u.k || v.done) return r(c, v);
          v = e[c](v).value;
        }
        i(o.done ? "return" : "normal", v);
      }, function(v) {
        r("throw", v);
      });
    } catch (v) {
      i("throw", v);
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
    (t = t.next) ? r(t.key, t.arg) : n = null;
  }
  this._invoke = function(s, a) {
    return new Promise(function(o, u) {
      var h = {
        key: s,
        arg: a,
        resolve: o,
        reject: u,
        next: null
      };
      n ? n = n.next = h : (t = n = h, r(s, a));
    });
  }, typeof e.return != "function" && (this.return = void 0);
}
pt.prototype[typeof Symbol == "function" && Symbol.asyncIterator || "@@asyncIterator"] = function() {
  return this;
}, pt.prototype.next = function(e) {
  return this._invoke("next", e);
}, pt.prototype.throw = function(e) {
  return this._invoke("throw", e);
}, pt.prototype.return = function(e) {
  return this._invoke("return", e);
};
function Ei(e, t, n, r) {
  const i = ft() ? ot : Jn;
  var s = e.filter((d) => !d.settled), a = t.map(i);
  if (n.length === 0 && s.length === 0) {
    r(a);
    return;
  }
  var o = b, u = Mi(), h = s.length === 1 ? s[0].promise : s.length > 1 ? Promise.all(s.map((d) => d.promise)) : null;
  function v(d) {
    if ((o.f & 16384) === 0) {
      u();
      try {
        r([...a, ...d]);
      } catch (m) {
        ae(m, o);
      }
      Et();
    }
  }
  var c = Zn();
  if (n.length === 0) {
    h.then(() => v([])).finally(c);
    return;
  }
  function f() {
    Promise.all(n.map((d) => /* @__PURE__ */ Ci(d))).then(v).catch((d) => ae(d, o)).finally(c);
  }
  h ? h.then(() => {
    if ((o.f & 16384) !== 0) {
      c();
      return;
    }
    u(), f(), Et();
  }) : f();
}
function Mi() {
  var e = b, t = k, n = O, r = w;
  if (0) var i;
  return function(a = !0) {
    K(e), G(t), qe(n), a && (e.f & 16384) === 0 && (r == null || r.activate(), r == null || r.apply());
  };
}
var Ti = !1;
function Et(e = !0) {
  Ti = !1, K(null), G(null), qe(null), e && (w == null || w.deactivate());
}
function Zn() {
  var e = b, t = e.b, n = w, r = !!(t != null && t.is_rendered());
  return t == null || t.update_pending_count(1, n), n.increment(r, e), () => {
    t == null || t.update_pending_count(-1, n), n.decrement(r, e);
  };
}
// @__NO_SIDE_EFFECTS__
function ot(e) {
  var t = 2 | U;
  return b !== null && (b.f |= Ge), {
    ctx: O,
    deps: null,
    effects: null,
    equals: Un,
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
var Ze = /* @__PURE__ */ Symbol("obsolete");
// @__NO_SIDE_EFFECTS__
function Ci(e, t, n) {
  let r = b;
  r === null && fi();
  var i = void 0, s = dt(L), a = !k, o = /* @__PURE__ */ new Set();
  return es(() => {
    var u = b, h = Rn();
    i = h.promise;
    try {
      Promise.resolve(e()).then(h.resolve, (_) => {
        _ !== ct && h.reject(_);
      }).finally(Et);
    } catch (_) {
      h.reject(_), Et();
    }
    var v = w;
    if (a) {
      var c;
      if ((u.f & 32768) !== 0) var f = Zn();
      if (!((c = r.b) === null || c === void 0) && c.is_rendered()) {
        var d;
        (d = v.async_deriveds.get(u)) === null || d === void 0 || d.reject(Ze);
      } else for (const _ of o.values()) _.reject(Ze);
      o.add(h), v.async_deriveds.set(u, h);
    }
    const m = (_, $ = void 0) => {
      f == null || f(), o.delete(h), $ !== Ze && (v.activate(), $ ? (s.f |= xt, Pt(s, $)) : ((s.f & 8388608) !== 0 && (s.f ^= xt), Pt(s, _)), v.deactivate());
    };
    h.promise.then(m, (_) => m(null, _ || "unknown"));
  }), Gi(() => {
    for (const u of o) u.reject(Ze);
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
function Jn(e) {
  const t = /* @__PURE__ */ ot(e);
  return t.equals = qn, t;
}
function Ai(e) {
  var t = e.effects;
  if (t !== null) {
    e.effects = null;
    for (var n = 0; n < t.length; n += 1) Q(t[n]);
  }
}
function ln(e) {
  var t, n = b, r = e.parent;
  if (!ce && r !== null && e.v !== L && (r.f & 24576) !== 0)
    return ii(), e.v;
  K(r);
  try {
    Ai(e), t = Er(e);
  } finally {
    K(n);
  }
  return t;
}
function Qn(e) {
  var t = ln(e);
  if (!e.equals(t) && (e.wv = xr(), (!(w != null && w.is_fork) || e.deps === null) && (w !== null ? (w.capture(e, t, !0), he == null || he.capture(e, t, !0)) : e.v = t, e.deps === null))) {
    P(e, Y);
    return;
  }
  ce || (j !== null ? (vn() || w != null && w.is_fork) && j.set(e, t) : an(e));
}
function Oi(e) {
  if (e.effects !== null) {
    for (const n of e.effects) if (n.teardown || n.ac) {
      var t;
      (t = n.teardown) === null || t === void 0 || t.call(n), n.ac !== null && Nt(() => {
        n.ac.abort(ct), n.ac = null;
      }), n.fn !== null && (n.teardown = Gr), lt(n, 0), hn(n);
    }
  }
}
function er(e) {
  if (e.effects !== null)
    for (const t of e.effects) t.teardown && t.fn !== null && Ie(t);
}
function tr(e, t) {
  if (t.has(e)) throw new TypeError("Cannot initialize the same private elements twice on an object");
}
function un(e, t) {
  tr(e, t), t.add(e);
}
function x(e, t, n) {
  tr(e, t), t.set(e, n);
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
var nr, Mt = null, Ne = null, w = null, he = null, j = null, Zt = null, tt = !1, Ut = !1, at = null, Tt = null, rr = 0;
var ji = 1, Ct = /* @__PURE__ */ new WeakMap(), _t = /* @__PURE__ */ new WeakMap(), Be = /* @__PURE__ */ new WeakMap(), $e = /* @__PURE__ */ new WeakMap(), Je = /* @__PURE__ */ new WeakMap(), Pe = /* @__PURE__ */ new WeakMap(), Jt = /* @__PURE__ */ new WeakMap(), pe = /* @__PURE__ */ new WeakMap(), ve = /* @__PURE__ */ new WeakMap(), bt = /* @__PURE__ */ new WeakMap(), Qe = /* @__PURE__ */ new WeakMap(), T = /* @__PURE__ */ new WeakSet(), Ke = class ir {
  constructor() {
    un(this, T), M(this, "id", ji++), M(this, "started", !1), M(this, "linked", !0), M(this, "prev", null), M(this, "next", null), M(this, "async_deriveds", /* @__PURE__ */ new Map()), M(this, "current", /* @__PURE__ */ new Map()), M(this, "previous", /* @__PURE__ */ new Map()), x(this, Ct, /* @__PURE__ */ new Set()), x(this, _t, /* @__PURE__ */ new Set()), x(this, Be, 0), x(this, $e, /* @__PURE__ */ new Map()), x(this, Je, null), x(this, Pe, []), x(this, Jt, []), x(this, pe, /* @__PURE__ */ new Map()), x(this, ve, /* @__PURE__ */ new Map()), x(this, bt, /* @__PURE__ */ new Set()), M(this, "is_fork", !1), x(this, Qe, !1), Ne === null ? Mt = Ne = this : (Ne.next = this, this.prev = Ne), Ne = this;
  }
  skip_effect(t) {
    l(ve, this).has(t) || l(ve, this).set(t, {
      d: [],
      m: []
    }), l(bt, this).delete(t);
  }
  unskip_effect(t, n = (r) => this.schedule(r)) {
    var r = l(ve, this).get(t);
    if (r) {
      l(ve, this).delete(t);
      for (var i of r.d)
        P(i, U), n(i);
      for (i of r.m)
        P(i, fe), n(i);
    }
    l(bt, this).add(t);
  }
  capture(t, n, r = !1) {
    t.v !== L && !this.previous.has(t) && this.previous.set(t, t.v), (t.f & 8388608) === 0 && (this.current.set(t, [n, r]), j == null || j.set(t, n)), this.is_fork || (t.v = n);
  }
  activate() {
    w = this;
  }
  deactivate() {
    w = null, j = null;
  }
  flush() {
    try {
      Ut = !0, w = this, g(T, this, At).call(this);
    } finally {
      rr = 0, Zt = null, at = null, Tt = null, Ut = !1, w = null, j = null, oe.clear();
    }
  }
  discard() {
    var t;
    for (const n of l(_t, this)) n(this);
    l(_t, this).clear();
    for (const n of this.async_deriveds.values()) n.reject(Ze);
    g(T, this, Ot).call(this), (t = l(Je, this)) === null || t === void 0 || t.resolve();
  }
  register_created_effect(t) {
    l(Jt, this).push(t);
  }
  increment(t, n) {
    if (y(Be, this, l(Be, this) + 1), t) {
      var r;
      let i = (r = l($e, this).get(n)) !== null && r !== void 0 ? r : 0;
      l($e, this).set(n, i + 1);
    }
  }
  decrement(t, n) {
    if (y(Be, this, l(Be, this) - 1), t) {
      var r;
      let i = (r = l($e, this).get(n)) !== null && r !== void 0 ? r : 0;
      i === 1 ? l($e, this).delete(n) : l($e, this).set(n, i - 1);
    }
    l(Qe, this) || (y(Qe, this, !0), je(() => {
      y(Qe, this, !1), this.linked && this.flush();
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
    l(Ct, this).add(t);
  }
  ondiscard(t) {
    l(_t, this).add(t);
  }
  settled() {
    var t;
    return ((t = l(Je, this)) !== null && t !== void 0 ? t : y(Je, this, Rn())).promise;
  }
  static ensure() {
    if (w === null) {
      const t = w = new ir();
      !Ut && !tt && je(() => {
        t.started || t.flush();
      });
    }
    return w;
  }
  apply() {
    if (!Ve || !this.is_fork && this.prev === null && this.next === null) {
      j = null;
      return;
    }
    j = /* @__PURE__ */ new Map();
    for (const [t, [n]] of this.current) j.set(t, n);
    for (let t = Mt; t !== null; t = t.next)
      if (!(t === this || t.is_fork) && (t.id >= this.id || !g(T, t, ar).call(t, this)))
        for (const [n, r] of t.previous) j.has(n) || j.set(n, r);
  }
  schedule(t) {
    var n;
    if (Zt = t, !((n = t.b) === null || n === void 0) && n.is_pending && (t.f & 16777228) !== 0 && (t.f & 32768) === 0) {
      t.b.defer_effect(t);
      return;
    }
    l(Pe, this).push(t);
  }
};
nr = Ke;
function kn() {
  if (this.is_fork) return !0;
  for (const e of l($e, this).keys()) if (!g(T, this, Pi).call(this, e)) return !0;
  return !1;
}
function Pi(e) {
  for (var t = e; t !== null; t = t.parent) if (l(ve, this).has(t)) return !0;
  return !1;
}
function sr() {
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
function At() {
  var e;
  this.started = !0;
  for (const [o, u] of l(pe, this))
    P(o, u), this.schedule(o);
  this.apply();
  for (var t = at = [], n = [], r = Tt = []; l(Pe, this).length > 0; ) {
    rr++ > 1e3 && (g(T, this, Ot).call(this), Ni());
    for (const o of g(T, this, sr).call(this)) try {
      g(T, this, or).call(this, o, t, n);
    } catch (u) {
      throw cr(o), g(T, this, kn).call(this) || this.discard(), u;
    }
  }
  if (w = null, r.length > 0) {
    var i = nr.ensure();
    for (const o of r) i.schedule(o);
  }
  if (at = null, Tt = null, g(T, this, kn).call(this)) {
    g(T, this, et).call(this, n), g(T, this, et).call(this, t);
    for (const [o, u] of l(ve, this)) ur(o, u);
    r.length > 0 && g(T, w, At).call(w);
    return;
  }
  const s = g(T, this, Li).call(this);
  if (s) {
    g(T, this, et).call(this, n), g(T, this, et).call(this, t), g(T, s, Ii).call(s, this);
    return;
  }
  l(pe, this).clear();
  for (const o of l(Ct, this)) o(this);
  l(Ct, this).clear(), he = this, $n(n), $n(t), he = null, (e = l(Je, this)) === null || e === void 0 || e.resolve();
  var a = w;
  l(Be, this) === 0 && (l(Pe, this).length === 0 || a !== null) && (g(T, this, Ot).call(this), Ve && (g(T, this, Ri).call(this), w = a)), a !== null && (oe.clear(), g(T, a, At).call(a));
}
function or(e, t, n) {
  e.f ^= Y;
  for (var r = e.first; r !== null; ) {
    var i = r.f, s = (i & 96) !== 0;
    if (!(s && (i & 1024) !== 0 || (i & 8192) !== 0 || l(ve, this).has(r)) && r.fn !== null) {
      s ? r.f ^= Y : (i & 4) !== 0 ? t.push(r) : Ve && (i & 16777224) !== 0 ? n.push(r) : Xe(r) && ((i & 16) !== 0 && this.add_dirty_reaction(r, fe), Ie(r));
      var a = r.first;
      if (a !== null) {
        r = a;
        continue;
      }
    }
    for (; r !== null; ) {
      var o = r.next;
      if (o !== null) {
        r = o;
        break;
      }
      r = r.parent;
    }
  }
}
function Li() {
  for (var e = this.prev; e !== null; e = e.prev) if (!e.is_fork && g(T, this, ar).call(this, e)) return e;
  return null;
}
function ar(e) {
  for (const [t, [, n]] of this.current)
    if (!n && e.current.has(t))
      return !0;
  return !1;
}
function Ii(e) {
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
      for (const a of r) {
        var i = a.f;
        if ((i & 2) !== 0) t(a);
        else {
          var s = a;
          i & 4194320 && !this.async_deriveds.has(s) && (l(pe, this).delete(s), P(s, U), this.schedule(s));
        }
      }
  };
  for (const n of this.current.keys()) t(n);
  this.oncommit(() => e.discard()), g(T, e, Ot).call(e), w = this, g(T, this, At).call(this);
}
function et(e) {
  for (var t = 0; t < e.length; t += 1) Xn(e[t], l(pe, this));
}
function Ri() {
  for (let v = Mt; v !== null; v = v.next) {
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
        if (e) for (const c of l(bt, this)) v.unskip_effect(c, (f) => {
          (f.f & 4194320) !== 0 ? v.schedule(f) : g(T, v, et).call(v, [f]);
        });
        v.activate();
        var s = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Map();
        for (var o of t) lr(o, i, s, a);
        a = /* @__PURE__ */ new Map();
        var u = [...v.current].filter(([c, f]) => {
          const d = this.current.get(c);
          return d ? d[0] !== f[0] || d[1] !== f[1] : !0;
        }).map(([c]) => c);
        if (u.length > 0)
          for (const c of l(Jt, this)) (c.f & 155648) === 0 && fn(c, u, a) && ((c.f & 4194320) !== 0 ? (P(c, U), v.schedule(c)) : v.add_dirty_reaction(c, U));
        if (l(Pe, v).length > 0 && !l(Qe, v)) {
          v.apply();
          for (var h of g(T, v, sr).call(v)) g(T, v, or).call(v, h, [], []);
        }
        v.deactivate();
      }
    }
  }
}
function Ot() {
  if (this.linked) {
    var e = this.prev, t = this.next;
    e === null ? Mt = t : e.next = t, t === null ? Ne = e : t.prev = e, this.linked = !1;
  }
}
function cn(e) {
  var t = tt, n = he;
  he = null, tt = !0;
  try {
    var r;
    for (e && (cn(), r = e()); ; ) {
      if ($i(), w === null) return r;
      w.flush();
    }
  } finally {
    tt = t, he = n;
  }
}
function Ni() {
  if (0) {
    var e;
    for (const r of w.current.keys()) {
      var t;
      for (const [i, s] of (t = r.updated) !== null && t !== void 0 ? t : [])
        var n;
    }
  }
  try {
    pi();
  } catch (r) {
    ae(r, Zt);
  }
}
var X = null;
function $n(e) {
  var t = e.length;
  if (t !== 0) {
    for (var n = 0; n < t; ) {
      var r = e[n++];
      if ((r.f & 24576) === 0 && Xe(r) && (X = /* @__PURE__ */ new Set(), Ie(r), r.deps === null && r.first === null && r.nodes === null && r.teardown === null && r.ac === null && br(r), (X == null ? void 0 : X.size) > 0)) {
        oe.clear();
        for (const i of X) {
          if ((i.f & 24576) !== 0) continue;
          const s = [i];
          let a = i.parent;
          for (; a !== null; )
            X.has(a) && (X.delete(a), s.push(a)), a = a.parent;
          for (let o = s.length - 1; o >= 0; o--) {
            const u = s[o];
            (u.f & 24576) === 0 && Ie(u);
          }
        }
        X.clear();
      }
    }
    X = null;
  }
}
function lr(e, t, n, r) {
  if (!n.has(e) && (n.add(e), e.reactions !== null))
    for (const i of e.reactions) {
      const s = i.f;
      (s & 2) !== 0 ? lr(i, t, n, r) : (s & 4194320) !== 0 && (s & 2048) === 0 && fn(i, t, r) && (P(i, U), dn(i));
    }
}
function fn(e, t, n) {
  const r = n.get(e);
  if (r !== void 0) return r;
  if (e.deps !== null) for (const i of e.deps) {
    if (rt.call(t, i)) return !0;
    if ((i.f & 2) !== 0 && fn(i, t, n))
      return n.set(i, !0), !0;
  }
  return n.set(e, !1), !1;
}
function dn(e) {
  w.schedule(e);
}
function ur(e, t) {
  if (!((e.f & 32) !== 0 && (e.f & 1024) !== 0)) {
    (e.f & 2048) !== 0 ? t.d.push(e) : (e.f & 4096) !== 0 && t.m.push(e), P(e, Y);
    for (var n = e.first; n !== null; )
      ur(n, t), n = n.next;
  }
}
function cr(e) {
  P(e, Y);
  for (var t = e.first; t !== null; )
    cr(t), t = t.next;
}
var jt = /* @__PURE__ */ new Set(), oe = /* @__PURE__ */ new Map();
var fr = !1;
function dt(e, t) {
  var n = {
    f: 0,
    v: e,
    reactions: null,
    equals: Un,
    rv: 0,
    wv: 0
  };
  return n;
}
// @__NO_SIDE_EFFECTS__
function de(e, t) {
  const n = dt(e, t);
  return ss(n), n;
}
// @__NO_SIDE_EFFECTS__
function dr(e, t = !1, n = !0) {
  const r = dt(e);
  if (t || (r.equals = qn), Ye && n && O !== null && O.l !== null) {
    var i, s;
    ((s = (i = O.l).s) !== null && s !== void 0 ? s : i.s = []).push(r);
  }
  return r;
}
function ie(e, t, n = !1) {
  k !== null && (!Z || (k.f & 131072) !== 0) && ft() && (k.f & 4325394) !== 0 && (ee === null || !ee.has(e)) && yi();
  let r = n ? De(t) : t;
  return Pt(e, r, Tt);
}
var xe = null, Qt = 0;
function Pt(e, t, n = null) {
  if (!e.equals(t)) {
    ce ? oe.set(e, t) : oe.has(e) || oe.set(e, e.v);
    var r = Ke.ensure();
    if (r.capture(e, t), 0 && (tracing_mode_flag || b !== null))
      var i, s, a;
    if ((e.f & 2) !== 0) {
      const o = e;
      (e.f & 2048) !== 0 && ln(o), j === null && an(o);
    }
    e.wv = xr(), xe = null, Qt = 0, vr(e, U, n), xe = null, ft() && b !== null && (b.f & 1024) !== 0 && (b.f & 96) === 0 && (V === null ? os([e]) : V.push(e)), !r.is_fork && jt.size > 0 && !fr && Bi();
  }
  return t;
}
function Bi() {
  fr = !1;
  for (const e of jt) {
    (e.f & 1024) !== 0 && P(e, fe);
    let t;
    try {
      t = Xe(e);
    } catch (n) {
      t = !0;
    }
    t && Ie(e);
  }
  jt.clear();
}
function nt(e) {
  ie(e, e.v + 1);
}
function vr(e, t, n) {
  var r = e.reactions;
  if (r !== null) {
    var i = ft(), s = r.length;
    if (Qt += s, Qt > 1e5 && xe === null && (xe = /* @__PURE__ */ new Set()), xe !== null) {
      if (xe.has(e)) return;
      xe.add(e);
    }
    for (var a = 0; a < s; a++) {
      var o = r[a], u = o.f;
      if (!(!i && o === b)) {
        var h = (u & U) === 0;
        if (h && P(o, t), (u & 131072) !== 0) jt.add(o);
        else if ((u & 2) !== 0) {
          var v = o;
          j == null || j.delete(v), vr(v, fe, n);
        } else if (h) {
          var c = o;
          (u & 16) !== 0 && X !== null && X.add(c), n !== null ? n.push(c) : dn(c);
        }
      }
    }
  }
}
var Wi = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;
function De(e) {
  if (typeof e != "object" || e === null || Fe in e || Fn in e) return e;
  const t = In(e);
  if (t !== Vr && t !== Yr) return e;
  var n = /* @__PURE__ */ new Map(), r = Fr(e), i = /* @__PURE__ */ de(0), s = null, a = Ce, o = (c) => {
    if (Ce === a) return c();
    var f = k, d = Ce;
    G(null), En(a);
    var m = c();
    return G(f), En(d), m;
  };
  r && n.set("length", /* @__PURE__ */ de(e.length, s));
  var u = "";
  let h = !1;
  function v(c) {
    if (!h) {
      h = !0, u = c, yn(i, `${u} version`);
      for (const [f, d] of n) yn(d, zi(u, f));
      h = !1;
    }
  }
  return new Proxy(e, {
    defineProperty(c, f, d) {
      (!("value" in d) || d.configurable === !1 || d.enumerable === !1 || d.writable === !1) && gi();
      var m = n.get(f);
      return m === void 0 ? o(() => {
        var _ = /* @__PURE__ */ de(d.value, s);
        return n.set(f, _), _;
      }) : ie(m, d.value, !0), !0;
    },
    deleteProperty(c, f) {
      var d = n.get(f);
      if (d === void 0) {
        if (f in c) {
          const m = o(() => /* @__PURE__ */ de(L, s));
          n.set(f, m), nt(i);
        }
      } else
        ie(d, L), nt(i);
      return !0;
    },
    get(c, f, d) {
      var m;
      if (f === Fe) return e;
      var _ = n.get(f), $ = f in c;
      if (_ === void 0 && (!$ || !((m = Te(c, f)) === null || m === void 0) && m.writable) && (_ = o(() => {
        var E = De($ ? c[f] : L), I = /* @__PURE__ */ de(E, s);
        return I;
      }), n.set(f, _)), _ !== void 0) {
        var p = N(_);
        return p === L ? void 0 : p;
      }
      return Reflect.get(c, f, d);
    },
    getOwnPropertyDescriptor(c, f) {
      var d;
      (d = this.has) === null || d === void 0 || d.call(this, c, f);
      var m = Reflect.getOwnPropertyDescriptor(c, f), _ = n.get(f);
      if (_ !== void 0) {
        var $ = N(_);
        if ($ === L) return;
        if (m && "value" in m) m.value = $;
        else return {
          enumerable: !0,
          configurable: !0,
          value: $,
          writable: !0
        };
      }
      return m;
    },
    has(c, f) {
      var d;
      if (f === Fe) return !0;
      var m = n.get(f), _ = m !== void 0 && m.v !== L || Reflect.has(c, f);
      return (m !== void 0 || (b !== null || k !== null) && (!_ || !((d = Te(c, f)) === null || d === void 0) && d.writable)) && (m === void 0 && (m = o(() => {
        var $ = _ ? De(c[f]) : L, p = /* @__PURE__ */ de($, s);
        return p;
      }), n.set(f, m)), N(m) === L) ? !1 : _;
    },
    set(c, f, d, m) {
      var _ = n.get(f), $ = f in c;
      if (r && f === "length") for (var p = d; p < _.v; p += 1) {
        var E = n.get(p + "");
        E !== void 0 ? ie(E, L) : p in c && (E = o(() => /* @__PURE__ */ de(L, s)), n.set(p + "", E));
      }
      if (_ === void 0) {
        var I;
        (!$ || !((I = Te(c, f)) === null || I === void 0) && I.writable) && (_ = o(() => /* @__PURE__ */ de(void 0, s)), ie(_, De(d)), n.set(f, _));
      } else {
        $ = _.v !== L;
        var q = o(() => De(d));
        ie(_, q);
      }
      var B = Reflect.getOwnPropertyDescriptor(c, f);
      if (B != null && B.set && B.set.call(m, d), !$) {
        if (r && typeof f == "string") {
          var S = n.get("length"), R = Number(f);
          Number.isInteger(R) && R >= S.v && ie(S, R + 1);
        }
        nt(i);
      }
      return !0;
    },
    ownKeys(c) {
      N(i);
      var f = Reflect.ownKeys(c).filter((_) => {
        var $ = n.get(_);
        return $ === void 0 || $.v !== L;
      });
      for (var [d, m] of n) m.v !== L && !(d in c) && f.push(d);
      return f;
    },
    setPrototypeOf() {
      wi();
    }
  });
}
function zi(e, t) {
  var n;
  return typeof t == "symbol" ? `${e}[Symbol(${(n = t.description) !== null && n !== void 0 ? n : ""})]` : Wi.test(t) ? `${e}.${t}` : /^\d+$/.test(t) ? `${e}[${t}]` : `${e}['${t}']`;
}
var xn, Di, Fi, hr, pr;
function en() {
  if (xn === void 0) {
    xn = window, Di = document, Fi = /Firefox/.test(navigator.userAgent);
    var e = Element.prototype, t = Node.prototype, n = Text.prototype;
    hr = Te(t, "firstChild").get, pr = Te(t, "nextSibling").get, gn(e) && (e[ti] = void 0, e[ei] = null, e[ni] = void 0, e.__e = void 0), gn(n) && (n[ri] = void 0);
  }
}
function Bt(e = "") {
  return document.createTextNode(e);
}
// @__NO_SIDE_EFFECTS__
function Se(e) {
  return hr.call(e);
}
// @__NO_SIDE_EFFECTS__
function we(e) {
  return pr.call(e);
}
function Hi(e, t = !1) {
  if (!W) {
    var n = /* @__PURE__ */ Se(e);
    return n instanceof Comment && n.data === "" ? /* @__PURE__ */ we(n) : n;
  }
  if (t) {
    if ((A == null ? void 0 : A.nodeType) !== 3) {
      var r = Bt();
      return A == null || A.before(r), ge(r), r;
    }
    qi(A);
  }
  return A;
}
function Ui(e) {
  e.textContent = "";
}
function _r(e, t, n) {
  return t == null || t === "http://www.w3.org/1999/xhtml" ? n ? document.createElement(e, { is: n }) : document.createElement(e) : n ? document.createElementNS(t, e, { is: n }) : document.createElementNS(t, e);
}
function qi(e) {
  if (e.nodeValue.length < 65536) return;
  let t = e.nextSibling;
  for (; t !== null && t.nodeType === 3; )
    t.remove(), e.nodeValue += t.nodeValue, t = e.nextSibling;
}
function Vi(e) {
  var t = b;
  if (t === null)
    return k.f |= xt, e;
  if ((t.f & 32768) === 0 && (t.f & 4) === 0)
    throw e;
  ae(e, t);
}
function ae(e, t) {
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
function mr(e) {
  b === null && (k === null && hi(e), vi()), ce && di(e);
}
function Yi(e, t) {
  var n = t.last;
  n === null ? t.last = t.first = e : (n.next = e, e.prev = n, t.last = e);
}
function le(e, t) {
  var n = b;
  n !== null && (n.f & 8192) !== 0 && (e |= Nn);
  var r = {
    ctx: O,
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
    at !== null ? at.push(r) : Ke.ensure().schedule(r);
  else if (t !== null) {
    try {
      Ie(r);
    } catch (o) {
      throw Q(r), o;
    }
    i.deps === null && i.teardown === null && i.nodes === null && i.first === i.last && (i.f & 524288) === 0 && (i = i.first, (e & 16) !== 0 && (e & 65536) !== 0 && i !== null && (i.f |= zn));
  }
  if (i !== null && (i.parent = n, n !== null && Yi(i, n), k !== null && (k.f & 2) !== 0 && (e & 64) === 0)) {
    var s, a = k;
    ((s = a.effects) !== null && s !== void 0 ? s : a.effects = []).push(i);
  }
  return r;
}
function vn() {
  return k !== null && !Z;
}
function Gi(e) {
  const t = le(8, null);
  return P(t, Y), t.teardown = e, t;
}
function tn(e) {
  mr("$effect");
  var t = b.f;
  if (!k && (t & 32) !== 0 && O !== null && !O.i) {
    var n, r = O;
    ((n = r.e) !== null && n !== void 0 ? n : r.e = []).push(e);
  } else return gr(e);
}
function gr(e) {
  return le(4 | Dn, e);
}
function Ki(e) {
  return mr("$effect.pre"), le(8 | Dn, e);
}
function Xi(e) {
  Ke.ensure();
  const t = le(64 | Ge, e);
  return () => {
    Q(t);
  };
}
function Zi(e) {
  Ke.ensure();
  const t = le(64 | Ge, e);
  return (n = {}) => new Promise((r) => {
    n.outro ? zt(t, () => {
      Q(t), r(void 0);
    }) : (Q(t), r(void 0));
  });
}
function Ji(e, t) {
  var n = O, r = {
    effect: null,
    ran: !1,
    deps: e
  };
  n.l.$.push(r), r.effect = Wt(() => {
    if (e(), !r.ran) {
      r.ran = !0;
      var i = b;
      try {
        K(i.parent), vt(t);
      } finally {
        K(i);
      }
    }
  });
}
function Qi() {
  var e = O;
  Wt(() => {
    for (var t of e.l.$) {
      t.deps();
      var n = t.effect;
      (n.f & 1024) !== 0 && n.deps !== null && P(n, fe), Xe(n) && Ie(n), t.ran = !1;
    }
  });
}
function es(e) {
  return le(Jr | Ge, e);
}
function Wt(e, t = 0) {
  return le(8 | t, e);
}
function ts(e, t = [], n = [], r = []) {
  Ei(r, t, n, (i) => {
    le(8, () => {
      e(...i.map(N));
    });
  });
}
function ns(e, t = 0) {
  var n = le(16 | t, e);
  return n;
}
function Le(e) {
  return le(32 | Ge, e);
}
function wr(e) {
  var t = e.teardown;
  if (t !== null) {
    const n = ce, r = k;
    Sn(!0), G(null);
    try {
      t.call(null);
    } catch (i) {
      ae(i, e.parent);
    } finally {
      Sn(n), G(r);
    }
  }
}
function hn(e, t = !1) {
  var n = e.first;
  for (e.first = e.last = null; n !== null; ) {
    const i = n.ac;
    i !== null && Nt(() => {
      i.abort(ct);
    });
    var r = n.next;
    (n.f & 64) !== 0 ? n.parent = null : Q(n, t), n = r;
  }
}
function rs(e) {
  for (var t = e.first; t !== null; ) {
    var n = t.next;
    (t.f & 32) === 0 && Q(t), t = n;
  }
}
function Q(e, t = !0) {
  var n = !1;
  (t || (e.f & 262144) !== 0) && e.nodes !== null && e.nodes.end !== null && (yr(e.nodes.start, e.nodes.end), n = !0), e.f |= Xt, hn(e, t && !n), lt(e, 0);
  var r = e.nodes && e.nodes.t;
  if (r !== null) for (const s of r) s.stop();
  wr(e), e.f ^= Xt, e.f |= Bn;
  var i = e.parent;
  i !== null && i.first !== null && br(e), e.next = e.prev = e.teardown = e.ctx = e.deps = e.fn = e.nodes = e.ac = e.b = null;
}
function yr(e, t) {
  for (; e !== null; ) {
    var n = e === t ? null : /* @__PURE__ */ we(e);
    e.remove(), e = n;
  }
}
function br(e) {
  var t = e.parent, n = e.prev, r = e.next;
  n !== null && (n.next = r), r !== null && (r.prev = n), t !== null && (t.first === e && (t.first = r), t.last === e && (t.last = n));
}
function zt(e, t, n = !0) {
  var r = [];
  e.f |= 256, kr(e, r, !0);
  var i = () => {
    n && Q(e), t && t();
  }, s = r.length;
  if (s > 0) {
    var a = () => --s || i();
    for (var o of r) o.out(a);
  } else i();
}
function kr(e, t, n) {
  if ((e.f & 8192) === 0) {
    e.f ^= Nn;
    var r = e.nodes && e.nodes.t;
    if (r !== null)
      for (const o of r) (o.is_global || n) && t.push(o);
    for (var i = e.first; i !== null; ) {
      var s = i.next;
      if ((i.f & 64) === 0) {
        var a = (i.f & 65536) !== 0 || (i.f & 32) !== 0 && (e.f & 16) !== 0;
        kr(i, t, a ? n : !1);
      }
      i = s;
    }
  }
}
function is(e, t) {
  if (e.nodes)
    for (var n = e.nodes.start, r = e.nodes.end; n !== null; ) {
      var i = n === r ? null : /* @__PURE__ */ we(n);
      t.append(n), n = i;
    }
}
var qt = null, ce = !1;
function Sn(e) {
  ce = e;
}
var k = null, Z = !1;
function G(e) {
  k = e;
}
var b = null;
function K(e) {
  b = e;
}
var ee = null;
function ss(e) {
  if (k !== null && (!Ve && (k.f & 2097152) !== 0 || (k.f & 2) !== 0)) {
    var t;
    ((t = ee) !== null && t !== void 0 ? t : ee = /* @__PURE__ */ new Set()).add(e);
  }
}
var z = null, F = 0, V = null;
function os(e) {
  V = e;
}
var $r = 1, Me = 0, Ce = Me;
function En(e) {
  Ce = e;
}
function xr() {
  return ++$r;
}
function Xe(e) {
  var t = e.f;
  if ((t & 2048) !== 0) return !0;
  if ((t & 4096) !== 0) {
    for (var n = e.deps, r = n.length, i = 0; i < r; i++) {
      var s = n[i];
      if (Xe(s) && Qn(s), s.wv > e.wv) return !0;
    }
    (t & 512) !== 0 && j === null && P(e, Y);
  }
  return !1;
}
function Sr(e, t, n = !0) {
  var r = e.reactions;
  if (r !== null && !(!Ve && ee !== null && ee.has(e)))
    for (var i = 0; i < r.length; i++) {
      var s = r[i];
      (s.f & 2) !== 0 ? Sr(s, t, !1) : t === s && (n ? P(s, U) : (s.f & 1024) !== 0 && P(s, fe), dn(s));
    }
}
function Er(e) {
  var t = z, n = F, r = V, i = k, s = ee, a = O, o = Z, u = Ce, h = e.f;
  z = null, F = 0, V = null, k = (h & 96) === 0 ? e : null, ee = null, qe(e.ctx), Z = !1, Ce = ++Me, e.ac !== null && (Nt(() => {
    e.ac.abort(ct);
  }), e.ac = null);
  try {
    e.f |= wn;
    var v = e.fn, c = v();
    e.f |= Wn;
    var f = Mn(e);
    if (ft() && V !== null && !Z && f !== null && (e.f & 6146) === 0) for (var d = 0; d < V.length; d++) Sr(V[d], e);
    if (i !== null && i !== e) {
      if (Me++, i.deps !== null) for (let m = 0; m < n; m += 1) i.deps[m].rv = Me;
      if (t !== null) for (const m of t) m.rv = Me;
      V !== null && (r === null ? r = V : r.push(...V));
    }
    return (e.f & 8388608) !== 0 && (e.f ^= xt), c;
  } catch (m) {
    return Mn(e), Vi(m);
  } finally {
    e.f ^= wn, z = t, F = n, V = r, k = i, ee = s, qe(a), Z = o, Ce = u;
  }
}
function Mn(e) {
  var t = e.deps, n = w == null ? void 0 : w.is_fork;
  if (z !== null) {
    var r;
    if (n || lt(e, F), t !== null && F > 0)
      for (t.length = F + z.length, r = 0; r < z.length; r++) t[F + r] = z[r];
    else e.deps = t = z;
    if (vn() && (e.f & 512) !== 0) for (r = F; r < t.length; r++) {
      var i, s;
      ((s = (i = t[r]).reactions) !== null && s !== void 0 ? s : i.reactions = []).push(e);
    }
  } else !n && t !== null && F < t.length && (lt(e, F), t.length = F);
  return t;
}
function as(e, t) {
  let n = t.reactions;
  if (n !== null) {
    var r = Hr.call(n, e);
    if (r !== -1) {
      var i = n.length - 1;
      i === 0 ? n = t.reactions = null : (n[r] = n[i], n.pop());
    }
  }
  if (n === null && (t.f & 2) !== 0 && (z === null || !rt.call(z, t))) {
    var s = t;
    (s.f & 512) !== 0 && (s.f ^= 512), s.v !== L && an(s), s.ac !== null && Nt(() => {
      s.ac.abort(ct), s.ac = null, P(s, U);
    }), Oi(s), lt(s, 0);
  }
}
function lt(e, t) {
  var n = e.deps;
  if (n !== null)
    for (var r = t; r < n.length; r++) as(e, n[r]);
}
function Ie(e) {
  var t = e.f;
  if ((t & 16384) === 0) {
    P(e, Y);
    var n = b;
    if (b = e, 0)
      var r, i, s;
    try {
      (t & 16777232) !== 0 ? rs(e) : hn(e), wr(e);
      var a = Er(e);
      if (e.teardown = typeof a == "function" ? a : null, e.wv = $r, 0)
        for (var o of e.deps) ;
    } finally {
      b = n;
    }
  }
}
function N(e) {
  var t = (e.f & 2) !== 0;
  if (qt == null || qt.add(e), k !== null && !Z && !(b !== null && (b.f & 16384) !== 0) && (ee === null || !ee.has(e))) {
    var n = k.deps;
    if ((k.f & 2097152) !== 0)
      e.rv < Me && (e.rv = Me, z === null && n !== null && n[F] === e ? F++ : z === null ? z = [e] : z.push(e));
    else {
      var r, i;
      (i = (r = k).deps) !== null && i !== void 0 || (r.deps = []), rt.call(k.deps, e) || k.deps.push(e);
      var s = e.reactions;
      s === null ? e.reactions = [k] : rt.call(s, k) || s.push(k);
    }
  }
  if (0) {
    if (!Z && reactivity_loss_tracker && w === null && he === null && !reactivity_loss_tracker.warned && (reactivity_loss_tracker.effect.f & 2097152) === 0 && !reactivity_loss_tracker.effect_deps.has(e))
      var a;
    if (tracing_mode_flag && !Z && tracing_expressions !== null && k !== null && tracing_expressions.reaction === k && !e.trace) {
      if (a)
        var o, u;
    }
  }
  if (ce && oe.has(e)) return oe.get(e);
  if (t) {
    var h = e;
    if (ce) {
      var v = h.v;
      return ((h.f & 1024) === 0 && h.reactions !== null || Tr(h)) && (v = ln(h)), oe.set(h, v), v;
    }
    var c = (h.f & 512) === 0 && !Z && k !== null && (k.f & 512) !== 0, f = (h.f & Wn) === 0;
    Xe(h) && (c && (h.f |= 512), Qn(h)), c && !f && (er(h), Mr(h));
  }
  if (j != null && j.has(e)) return j.get(e);
  if ((e.f & 8388608) !== 0) throw e.v;
  return e.v;
}
function Mr(e) {
  if (e.f |= 512, e.deps !== null)
    for (const n of e.deps) {
      var t = n.reactions;
      t === null ? n.reactions = [e] : rt.call(t, e) || t.push(e), (n.f & 2) !== 0 && (n.f & 512) === 0 && (er(n), Mr(n));
    }
}
function Tr(e) {
  if (e.v === L) return !0;
  if (e.deps === null) return !1;
  for (const t of e.deps)
    if (oe.has(t) || (t.f & 2) !== 0 && Tr(t)) return !0;
  return !1;
}
function vt(e) {
  var t = Z;
  try {
    return Z = !0, e();
  } finally {
    Z = t;
  }
}
function Cr(e) {
  if (!(typeof e != "object" || !e || e instanceof EventTarget)) {
    if (Fe in e) nn(e);
    else if (!Array.isArray(e)) for (let t in e) {
      const n = e[t];
      typeof n == "object" && n && Fe in n && nn(n);
    }
  }
}
function nn(e, t = /* @__PURE__ */ new Set()) {
  if (typeof e == "object" && e !== null && !(e instanceof EventTarget) && !t.has(e)) {
    t.add(e), e instanceof Date && e.getTime();
    for (let r in e) try {
      nn(e[r], t);
    } catch (i) {
    }
    const n = In(e);
    if (n !== Object.prototype && n !== Array.prototype && n !== Map.prototype && n !== Set.prototype && n !== Date.prototype) {
      const r = qr(n);
      for (let i in r) {
        const s = r[i].get;
        if (s) try {
          s.call(e);
        } catch (a) {
        }
      }
    }
  }
}
var mt = /* @__PURE__ */ Symbol("events"), ls = /* @__PURE__ */ new Set(), Tn = /* @__PURE__ */ new Set(), Vt = null, Yt = !1;
function Cn(e) {
  var t, n = this, r = n.ownerDocument, i = e.type, s = ((t = e.composedPath) === null || t === void 0 ? void 0 : t.call(e)) || [], a = s[0] || e.target;
  Vt = e, Yt || (Yt = !0, setTimeout(() => {
    Yt = !1, Vt = null;
  }));
  var o = 0, u = Vt === e && e[mt];
  if (u) {
    var h = s.indexOf(u);
    if (h !== -1 && (n === document || n === window)) {
      e[mt] = n;
      return;
    }
    var v = s.indexOf(n);
    if (v === -1) return;
    h <= v && (o = h);
  }
  if (a = s[o] || e.target, a !== n) {
    it(e, "currentTarget", {
      configurable: !0,
      get() {
        return a || r;
      }
    });
    var c = k, f = b;
    G(null), K(null);
    try {
      for (var d, m = []; a !== null && a !== n; ) {
        try {
          var _, $ = (_ = a[mt]) === null || _ === void 0 ? void 0 : _[i];
          $ != null && (!a.disabled || e.target === a) && $.call(a, e);
        } catch (p) {
          d ? m.push(p) : d = p;
        }
        if (e.cancelBubble) break;
        o++, a = o < s.length ? s[o] : null;
      }
      if (d) {
        for (let p of m) queueMicrotask(() => {
          throw p;
        });
        throw d;
      }
    } finally {
      e[mt] = n, delete e.currentTarget, G(c), K(f);
    }
  }
}
var Re, Ds = ((Re = globalThis) === null || Re === void 0 || (Re = Re.window) === null || Re === void 0 ? void 0 : Re.trustedTypes) && /* @__PURE__ */ globalThis.window.trustedTypes.createPolicy("svelte-trusted-html", { createHTML: (e) => e });
function He(e, t) {
  var n = b;
  n.nodes === null && (n.nodes = {
    start: e,
    end: t,
    a: null,
    t: null
  });
}
function us() {
  if (W)
    return He(A, null), A;
  var e = document.createDocumentFragment(), t = document.createComment(""), n = Bt();
  return e.append(t, n), He(t, n), e;
}
function Ar(e, t) {
  if (W) {
    var n = b;
    ((n.f & 32768) === 0 || n.nodes.end === null) && (n.nodes.end = A), St();
    return;
  }
  e !== null && e.before(t);
}
var cs = [
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
], Fs = [
  ...cs,
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
], fs = ["touchstart", "touchmove"];
function ds(e) {
  return fs.includes(e);
}
var vs = [
  "$state",
  "$state.raw",
  "$derived",
  "$derived.by"
], Hs = [
  ...vs,
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
function hs(e) {
  let t = 0, n = dt(0), r;
  return () => {
    vn() && (N(n), Wt(() => (t === 0 && (r = vt(() => e(() => nt(n)))), t += 1, () => {
      je(() => {
        t -= 1, t === 0 && (r == null || r(), r = void 0, nt(n));
      });
    })));
  };
}
var ps = zn | Ge;
function _s(e, t, n, r) {
  new ms(e, t, n, r);
}
var te = /* @__PURE__ */ new WeakMap(), rn = /* @__PURE__ */ new WeakMap(), se = /* @__PURE__ */ new WeakMap(), ut = /* @__PURE__ */ new WeakMap(), D = /* @__PURE__ */ new WeakMap(), ne = /* @__PURE__ */ new WeakMap(), H = /* @__PURE__ */ new WeakMap(), J = /* @__PURE__ */ new WeakMap(), _e = /* @__PURE__ */ new WeakMap(), We = /* @__PURE__ */ new WeakMap(), Ae = /* @__PURE__ */ new WeakMap(), gt = /* @__PURE__ */ new WeakMap(), sn = /* @__PURE__ */ new WeakMap(), be = /* @__PURE__ */ new WeakMap(), An = /* @__PURE__ */ new WeakMap(), C = /* @__PURE__ */ new WeakSet(), ms = class {
  constructor(e, t, n, r) {
    var i, s;
    un(this, C), M(this, "parent", void 0), M(this, "is_pending", !1), M(this, "transform_error", void 0), x(this, te, void 0), x(this, rn, W ? A : null), x(this, se, void 0), x(this, ut, void 0), x(this, D, void 0), x(this, ne, null), x(this, H, null), x(this, J, null), x(this, _e, null), x(this, We, 0), x(this, Ae, 0), x(this, gt, !1), x(this, sn, /* @__PURE__ */ new Map()), x(this, be, null), x(this, An, hs(() => (y(be, this, dt(l(We, this))), () => {
      y(be, this, null);
    }))), y(te, this, e), y(se, this, t), y(ut, this, (a) => {
      var o = b;
      o.b = this, o.f |= 128, n(a);
    }), this.parent = b.b, this.transform_error = (i = r != null ? r : (s = this.parent) === null || s === void 0 ? void 0 : s.transform_error) !== null && i !== void 0 ? i : ((a) => a), y(D, this, ns(() => {
      if (W) {
        const a = li(l(rn, this));
        St();
        const o = a === "[!";
        if (a.startsWith("[?")) {
          const u = JSON.parse(a.slice(2));
          g(C, this, ws).call(this, u);
        } else o ? g(C, this, ys).call(this) : g(C, this, gs).call(this);
      } else g(C, this, jr).call(this);
    }, ps)), W && y(te, this, A);
  }
  defer_effect(e) {
    Xn(e, l(sn, this));
  }
  is_rendered() {
    return !this.is_pending && (!this.parent || this.parent.is_rendered());
  }
  has_pending_snippet() {
    return !!l(se, this).pending;
  }
  update_pending_count(e, t) {
    g(C, this, Pr).call(this, e, t), y(We, this, l(We, this) + e), !(!l(be, this) || l(gt, this)) && (y(gt, this, !0), je(() => {
      y(gt, this, !1), l(be, this) && Pt(l(be, this), l(We, this));
    }));
  }
  get_effect_pending() {
    return l(An, this).call(this), N(l(be, this));
  }
  error(e) {
    if (e === me || !l(se, this).onerror && !l(se, this).failed) throw e;
    w != null && w.is_fork ? (l(ne, this) && w.skip_effect(l(ne, this)), l(H, this) && w.skip_effect(l(H, this)), l(J, this) && w.skip_effect(l(J, this)), w.oncommit(() => {
      g(C, this, Oe).call(this) || g(C, this, On).call(this, e);
    })) : g(C, this, On).call(this, e);
  }
};
function gs() {
  try {
    y(ne, this, Le(() => l(ut, this).call(this, l(te, this))));
  } catch (e) {
    this.error(e);
  }
}
function ws(e) {
  const t = l(se, this).failed, { reset: n, invoke_onerror: r } = g(C, this, Or).call(this, e);
  je(r), t && y(J, this, Le(() => {
    t(l(te, this), () => e, () => n);
  }));
}
function Or(e) {
  var t = !1, n = !1;
  const r = () => {
    if (!g(C, this, Oe).call(this)) {
      if (t) {
        si();
        return;
      }
      t = !0, n && bi(), l(J, this) !== null && zt(l(J, this), () => {
        y(J, this, null);
      }), g(C, this, pn).call(this, () => {
        g(C, this, jr).call(this);
      });
    }
  };
  return {
    reset: r,
    invoke_onerror: () => {
      if (!g(C, this, Oe).call(this))
        try {
          var s, a;
          n = !0, (s = (a = l(se, this)).onerror) === null || s === void 0 || s.call(a, e, r), n = !1;
        } catch (o) {
          ae(o, l(D, this) && l(D, this).parent);
        }
    }
  };
}
function Oe() {
  return (l(D, this).f & (Bn | Xt)) !== 0;
}
function ys() {
  const e = l(se, this).pending;
  e && (this.is_pending = !0, y(H, this, Le(() => e(l(te, this)))), je(() => {
    if (!g(C, this, Oe).call(this)) {
      var t = y(_e, this, document.createDocumentFragment()), n = Bt(), r = !1;
      if (t.append(n), y(ne, this, g(C, this, pn).call(this, () => {
        try {
          return Le(() => l(ut, this).call(this, n));
        } catch (i) {
          try {
            this.error(i), r = !0;
          } catch (s) {
            ae(s, l(D, this).parent);
          }
          return null;
        }
      })), l(ne, this) === null) {
        y(_e, this, null), r && g(C, this, Lt).call(this, w);
        return;
      }
      l(Ae, this) === 0 && (l(te, this).before(t), y(_e, this, null), zt(l(H, this), () => {
        y(H, this, null);
      }), g(C, this, Lt).call(this, w));
    }
  }));
}
function jr() {
  try {
    if (this.is_pending = this.has_pending_snippet(), y(Ae, this, 0), y(We, this, 0), y(ne, this, Le(() => {
      l(ut, this).call(this, l(te, this));
    })), l(Ae, this) > 0) {
      var e = y(_e, this, document.createDocumentFragment());
      is(l(ne, this), e);
      const t = l(se, this).pending;
      y(H, this, Le(() => t(l(te, this))));
    } else g(C, this, Lt).call(this, w);
  } catch (t) {
    this.error(t);
  }
}
function Lt(e) {
  this.is_pending = !1, e.transfer_reactions(l(sn, this));
}
function pn(e) {
  var t = b, n = k, r = O;
  K(l(D, this)), G(l(D, this)), qe(l(D, this).ctx);
  try {
    return Ke.ensure(), e();
  } finally {
    K(t), G(n), qe(r);
  }
}
function Pr(e, t) {
  if (!this.has_pending_snippet()) {
    if (this.parent) {
      var n;
      g(C, n = this.parent, Pr).call(n, e, t);
    }
    return;
  }
  y(Ae, this, l(Ae, this) + e), l(Ae, this) === 0 && (g(C, this, Lt).call(this, t), l(H, this) && zt(l(H, this), () => {
    y(H, this, null);
  }), l(_e, this) && (l(te, this).before(l(_e, this)), y(_e, this, null)));
}
function On(e) {
  l(ne, this) && (Q(l(ne, this)), y(ne, this, null)), l(H, this) && (Q(l(H, this)), y(H, this, null)), l(J, this) && (Q(l(J, this)), y(J, this, null)), W && (ge(l(rn, this)), oi(), ge(ai()));
  let t = l(se, this).failed;
  const n = (r) => {
    if (g(C, this, Oe).call(this)) return;
    const { reset: i, invoke_onerror: s } = g(C, this, Or).call(this, r);
    s(), t && !g(C, this, Oe).call(this) && y(J, this, g(C, this, pn).call(this, () => {
      try {
        return Le(() => {
          var a = b;
          a.b = this, a.f |= 128, t(l(te, this), () => r, () => i);
        });
      } catch (a) {
        return ae(a, l(D, this).parent), null;
      }
    }));
  };
  je(() => {
    if (!g(C, this, Oe).call(this)) {
      var r;
      try {
        r = this.transform_error(e);
      } catch (i) {
        ae(i, l(D, this) && l(D, this).parent);
        return;
      }
      r !== null && typeof r == "object" && typeof r.then == "function" ? r.then(n, (i) => ae(i, l(D, this) && l(D, this).parent)) : n(r);
    }
  });
}
var jn = !0;
function Lr(e, t) {
  return Ir(e, t);
}
function bs(e, t) {
  var n;
  en(), t.intro = (n = t.intro) !== null && n !== void 0 ? n : !1;
  const r = t.target, i = W, s = A;
  try {
    for (var a = /* @__PURE__ */ Se(r); a && (a.nodeType !== 8 || a.data !== "["); ) a = /* @__PURE__ */ we(a);
    if (!a) throw me;
    ht(!0), ge(a);
    const o = Ir(e, Ue(Ue({}, t), {}, { anchor: a }));
    return ht(!1), o;
  } catch (o) {
    if (o instanceof Error && o.message.split(`
`).some((u) => u.startsWith("https://svelte.dev/e/"))) throw o;
    return o !== me && console.warn("Failed to hydrate: ", o), t.recover === !1 && _i(), en(), Ui(r), ht(!1), Lr(e, t);
  } finally {
    ht(i), ge(s);
  }
}
var wt = /* @__PURE__ */ new Map();
function Ir(e, { target: t, anchor: n, props: r = {}, events: i, context: s, intro: a = !0, transformError: o }) {
  en();
  var u = void 0, h = Zi(() => {
    var v = n != null ? n : t.appendChild(Bt());
    _s(v, { pending: () => {
    } }, (d) => {
      Vn({});
      var m = O;
      if (s && (m.c = s), i && (r.$$events = i), W && He(d, null), jn = a, u = e(d, r) || Gn(), jn = !0, W && (b.nodes.end = A, A === null || A.nodeType !== 8 || A.data !== "]"))
        throw Rt(), me;
      Yn();
    }, o);
    var c = /* @__PURE__ */ new Set(), f = (d) => {
      for (var m = 0; m < d.length; m++) {
        var _ = d[m];
        if (!c.has(_)) {
          c.add(_);
          var $ = ds(_);
          for (const I of [t, document]) {
            var p = wt.get(I);
            p === void 0 && (p = /* @__PURE__ */ new Map(), wt.set(I, p));
            var E = p.get(_);
            E === void 0 ? (I.addEventListener(_, Cn, { passive: $ }), p.set(_, 1)) : p.set(_, E + 1);
          }
        }
      }
    };
    return f(Ur(ls)), Tn.add(f), () => {
      for (var d of c) for (const p of [t, document]) {
        var m = wt.get(p), _ = m.get(d);
        --_ == 0 ? (p.removeEventListener(d, Cn), m.delete(d), m.size === 0 && wt.delete(p)) : m.set(d, _);
      }
      if (Tn.delete(f), v !== n) {
        var $;
        ($ = v.parentNode) === null || $ === void 0 || $.removeChild(v);
      }
    };
  });
  return on.set(u, h), u;
}
var on = /* @__PURE__ */ new WeakMap();
function ks(e, t) {
  const n = on.get(e);
  return n ? (on.delete(e), n(t)) : Promise.resolve();
}
function $s(e) {
  O === null && ci("onMount"), Ye && O.l !== null ? xs(O).m.push(e) : tn(() => {
    const t = vt(e);
    if (typeof t == "function") return t;
  });
}
function xs(e) {
  var t, n = e.l;
  return (t = n.u) !== null && t !== void 0 ? t : n.u = {
    a: [],
    b: [],
    m: []
  };
}
function Ss(e, t, n = !1, r = !1, i = !1, s = !1) {
  var a = e, o = "";
  if (n) {
    var u = e;
    W && (a = ge(/* @__PURE__ */ Se(u)));
  }
  ts(() => {
    var h, v = b;
    if (o === (o = (h = t()) !== null && h !== void 0 ? h : "")) {
      W && St();
      return;
    }
    if (n && !W) {
      v.nodes = null, u.innerHTML = o, o !== "" && He(/* @__PURE__ */ Se(u), u.lastChild);
      return;
    }
    if (v.nodes !== null && (yr(v.nodes.start, v.nodes.end), v.nodes = null), o !== "") {
      if (W) {
        for (var c = A.data, f = St(), d = f; f !== null && (f.nodeType !== 8 || f.data !== ""); )
          d = f, f = /* @__PURE__ */ we(f);
        if (f === null)
          throw Rt(), me;
        He(A, d), a = ge(f);
        return;
      }
      var m = _r(r ? "svg" : i ? "math" : "template", r ? zr : i ? Dr : void 0);
      m.innerHTML = o;
      var _ = r || i ? m : m.content;
      if (He(/* @__PURE__ */ Se(_), _.lastChild), r || i) for (; /* @__PURE__ */ Se(_); ) a.before(/* @__PURE__ */ Se(_));
      else a.before(_);
    }
  });
}
var Rr, ze = /* @__PURE__ */ new WeakMap(), It = /* @__PURE__ */ new WeakMap(), Gt = /* @__PURE__ */ new WeakMap(), Pn = /* @__PURE__ */ new WeakSet(), Nr = class {
  constructor(e) {
    un(this, Pn), x(this, ze, /* @__PURE__ */ new WeakMap()), x(this, It, void 0), x(this, Gt, void 0), y(Gt, this, e);
  }
  observe(e, t) {
    var n = l(ze, this).get(e) || /* @__PURE__ */ new Set();
    return n.add(t), l(ze, this).set(e, n), g(Pn, this, Es).call(this).observe(e, l(Gt, this)), () => {
      var r = l(ze, this).get(e);
      r.delete(t), r.size === 0 && (l(ze, this).delete(e), l(It, this).unobserve(e));
    };
  }
};
Rr = Nr;
function Es() {
  var e;
  return (e = l(It, this)) !== null && e !== void 0 ? e : y(It, this, new ResizeObserver((t) => {
    for (var n of t) {
      Rr.entries.set(n.target, n);
      for (var r of l(ze, this).get(n.target) || []) r(n);
    }
  }));
}
M(Nr, "entries", /* @__PURE__ */ new WeakMap());
function Ms(e = !1) {
  const t = O, n = t.l.u;
  if (!n) return;
  let r = () => Cr(t.s);
  if (e) {
    let i = 0, s = {};
    const a = /* @__PURE__ */ ot(() => {
      let o = !1;
      const u = t.s;
      for (const h in u) u[h] !== s[h] && (s[h] = u[h], o = !0);
      return o && i++, i;
    });
    r = () => N(a);
  }
  n.b.length && Ki(() => {
    Ln(t, r), Kt(n.b);
  }), tn(() => {
    const i = vt(() => n.m.map(Kr));
    return () => {
      for (const s of i) typeof s == "function" && s();
    };
  }), n.a.length && tn(() => {
    Ln(t, r), Kt(n.a);
  });
}
function Ln(e, t) {
  if (e.l.s) for (const n of e.l.s) N(n);
  t();
}
var yt = !1;
function Ts(e) {
  var t = yt;
  try {
    return yt = !1, [e(), yt];
  } finally {
    yt = t;
  }
}
function Cs(e, t, n, r) {
  var i = !Ye || (n & 2) !== 0, s = (n & 8) !== 0, a = (n & 16) !== 0, o = r, u = !0, h = void 0, v = () => {
    if (a && i) {
      var S;
      return (S = h) !== null && S !== void 0 || (h = /* @__PURE__ */ ot(r)), N(h);
    }
    return u && (u = !1, o = a ? vt(r) : r), o;
  };
  let c;
  if (s) {
    var f, d, m = Fe in e || Hn in e;
    c = (f = (d = Te(e, t)) === null || d === void 0 ? void 0 : d.set) !== null && f !== void 0 ? f : m && t in e ? (S) => e[t] = S : void 0;
  }
  var _, $ = !1;
  s ? [_, $] = Ts(() => e[t]) : _ = e[t], _ === void 0 && r !== void 0 && (_ = v(), c && (i && mi(t), c(_)));
  var p;
  if (i ? p = () => {
    var S = e[t];
    return S === void 0 ? v() : (u = !0, S);
  } : p = () => {
    var S = e[t];
    return S !== void 0 && (o = void 0), S === void 0 ? o : S;
  }, i && (n & 4) === 0) return p;
  if (c) {
    var E = e.$$legacy;
    return (function(S, R) {
      return arguments.length > 0 ? ((!i || !R || E || $) && c(R ? p() : S), S) : p();
    });
  }
  var I = !1, q = ((n & 1) !== 0 ? ot : Jn)(() => (I = !1, p()));
  s && N(q);
  var B = b;
  return (function(S, R) {
    if (arguments.length > 0) {
      const ue = R ? N(q) : i && s ? De(S) : S;
      return ie(q, ue), I = !0, o !== void 0 && (o = ue), S;
    }
    return ce && I || (B.f & 16384) !== 0 ? q.v : N(q);
  });
}
function As(e) {
  return new Os(e);
}
var ke = /* @__PURE__ */ new WeakMap(), re = /* @__PURE__ */ new WeakMap(), Os = class {
  constructor(e) {
    var t, n;
    x(this, ke, void 0), x(this, re, void 0);
    var r = /* @__PURE__ */ new Map(), i = (a, o) => {
      var u = /* @__PURE__ */ dr(o, !1, !1);
      return r.set(a, u), u;
    };
    const s = new Proxy(Ue(Ue({}, e.props || {}), {}, { $$events: {} }), {
      get(a, o) {
        var u;
        return N((u = r.get(o)) !== null && u !== void 0 ? u : i(o, Reflect.get(a, o)));
      },
      has(a, o) {
        var u;
        return o === Hn ? !0 : (N((u = r.get(o)) !== null && u !== void 0 ? u : i(o, Reflect.get(a, o))), Reflect.has(a, o));
      },
      set(a, o, u) {
        var h;
        return ie((h = r.get(o)) !== null && h !== void 0 ? h : i(o, u), u), Reflect.set(a, o, u);
      }
    });
    y(re, this, (e.hydrate ? bs : Lr)(e.component, {
      target: e.target,
      anchor: e.anchor,
      props: s,
      context: e.context,
      intro: (t = e.intro) !== null && t !== void 0 ? t : !1,
      recover: e.recover,
      transformError: e.transformError
    })), !Ve && (!(!(e == null || (n = e.props) === null || n === void 0) && n.$$host) || e.sync === !1) && cn(), y(ke, this, s.$$events);
    for (const a of Object.keys(l(re, this)))
      a === "$set" || a === "$destroy" || a === "$on" || it(this, a, {
        get() {
          return l(re, this)[a];
        },
        set(o) {
          l(re, this)[a] = o;
        },
        enumerable: !0
      });
    l(re, this).$set = (a) => {
      Object.assign(s, a);
    }, l(re, this).$destroy = () => {
      ks(l(re, this));
    };
  }
  $set(e) {
    l(re, this).$set(e);
  }
  $on(e, t) {
    l(ke, this)[e] = l(ke, this)[e] || [];
    const n = (...r) => t.call(this, ...r);
    return l(ke, this)[e].push(n), () => {
      l(ke, this)[e] = l(ke, this)[e].filter((r) => r !== n);
    };
  }
  $destroy() {
    l(re, this).$destroy();
  }
}, Br;
typeof HTMLElement == "function" && (Br = class extends HTMLElement {
  constructor(e, t, n) {
    super(), M(this, "$$ctor", void 0), M(this, "$$s", void 0), M(this, "$$c", void 0), M(this, "$$cn", !1), M(this, "$$d", {}), M(this, "$$r", !1), M(this, "$$p_d", {}), M(this, "$$l", {}), M(this, "$$l_u", /* @__PURE__ */ new Map()), M(this, "$$me", void 0), M(this, "$$shadowRoot", null), this.$$ctor = e, this.$$s = t, n && (this.$$shadowRoot = this.attachShadow(n));
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
          const s = _r("slot");
          r !== "default" && (s.name = r), Ar(i, s);
        };
      };
      if (await Promise.resolve(), !this.$$cn || this.$$c) return;
      const t = {}, n = js(this);
      for (const r of this.$$s) r in n && (r === "default" && !this.$$d.children ? (this.$$d.children = e(r), t.default = !0) : t[r] = e(r));
      for (const r of this.attributes) {
        const i = this.$$g_p(r.name);
        i in this.$$d || (this.$$d[i] = kt(i, r.value, this.$$p_d, "toProp"));
      }
      for (const r in this.$$p_d) !(r in this.$$d) && this[r] !== void 0 && (this.$$d[r] = this[r], delete this[r]);
      this.$$c = As({
        component: this.$$ctor,
        target: this.$$shadowRoot || this,
        props: Ue(Ue({}, this.$$d), {}, {
          $$slots: t,
          $$host: this
        })
      }), this.$$me = Xi(() => {
        Wt(() => {
          this.$$r = !0;
          for (const i of $t(this.$$c)) {
            var r;
            if (!(!((r = this.$$p_d[i]) === null || r === void 0) && r.reflect)) continue;
            this.$$d[i] = this.$$c[i];
            const s = kt(i, this.$$d[i], this.$$p_d, "toAttribute");
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
    this.$$r || (e = this.$$g_p(e), this.$$d[e] = kt(e, n, this.$$p_d, "toProp"), (r = this.$$c) === null || r === void 0 || r.$set({ [e]: this.$$d[e] }));
  }
  disconnectedCallback() {
    this.$$cn = !1, Promise.resolve().then(() => {
      !this.$$cn && this.$$c && (this.$$c.$destroy(), this.$$me(), this.$$c = void 0);
    });
  }
  $$g_p(e) {
    return $t(this.$$p_d).find((t) => this.$$p_d[t].attribute === e || !this.$$p_d[t].attribute && t.toLowerCase() === e) || e;
  }
});
function kt(e, t, n, r) {
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
function js(e) {
  const t = {};
  return e.childNodes.forEach((n) => {
    t[n.slot || "default"] = !0;
  }), t;
}
function Ps(e, t, n, r, i, s) {
  let a = class extends Br {
    constructor() {
      super(e, n, i), this.$$p_d = t;
    }
    static get observedAttributes() {
      return $t(t).map((o) => (t[o].attribute || o).toLowerCase());
    }
  };
  return $t(t).forEach((o) => {
    it(a.prototype, o, {
      get() {
        return this.$$c && o in this.$$c ? this.$$c[o] : this.$$d[o];
      },
      set(u) {
        u = kt(o, u, t), this.$$d[o] = u;
        var h = this.$$c;
        if (h) {
          var v;
          !((v = Te(h, o)) === null || v === void 0) && v.get ? h[o] = u : h.$set({ [o]: u });
        }
      }
    });
  }), r.forEach((o) => {
    it(a.prototype, o, { get() {
      var u;
      return (u = this.$$c) === null || u === void 0 ? void 0 : u[o];
    } });
  }), s && (a = s(a)), e.element = a, a;
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
function Is(e, t) {
  Vn(t, !1);
  let n = Cs(t, "pageId", 12, "home");
  const r = "/widgets/comment-runtime.js?v=top-comment-snow-4", i = {
    dm: "/widgets/comment-dm.css",
    report: "/widgets/comment-report.css",
    settings: "/widgets/comment-settings.css",
    effects: "/widgets/comment-effects.css?v=avatar-frame-fit-2"
  }, s = [
    ["https://cdn.jsdelivr.net/npm/dompurify@3.2.7/dist/purify.min.js", () => !!window.DOMPurify],
    ["https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js", () => !!window.firebase],
    ["https://www.gstatic.com/firebasejs/10.14.0/firebase-auth-compat.js", () => {
      var p;
      return !!(!((p = window.firebase) === null || p === void 0) && p.auth);
    }],
    ["https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore-compat.js", () => {
      var p;
      return !!(!((p = window.firebase) === null || p === void 0) && p.firestore);
    }],
    ["https://cdn.jsdelivr.net/npm/md5@2.3.0/dist/md5.min.js", () => !!window.md5]
  ];
  let a = /* @__PURE__ */ dr(!1);
  const o = /* @__PURE__ */ new Map();
  let u = null;
  function h() {
    return u || (u = fetch(r).then((p) => {
      if (!p.ok) throw new Error(`Failed to load ${r}: ${p.status}`);
      return p.text();
    }), u);
  }
  function v(p) {
    if (document.head.querySelector(`link[href="${p}"]`)) return;
    const E = document.createElement("link");
    E.rel = "stylesheet", E.href = p, E.dataset.mikorokuCommentStyle = "", document.head.appendChild(E);
  }
  function c(p) {
    v(i[p]);
  }
  function f(p, E) {
    if (E()) return Promise.resolve();
    const I = o.get(p);
    if (I) return I;
    const q = new URL(p, document.baseURI).href, B = Array.from(document.scripts).find((R) => R.src === q), S = new Promise((R, ue) => {
      if (B) {
        if (B.dataset.loaded === "true") {
          ue(/* @__PURE__ */ new Error(`Script loaded without initializing its library: ${p}`));
          return;
        }
        B.addEventListener("load", () => {
          E() ? (B.dataset.loaded = "true", R()) : ue(/* @__PURE__ */ new Error(`Script loaded without initializing its library: ${p}`));
        }, { once: !0 }), B.addEventListener("error", () => {
          B.remove(), ue(/* @__PURE__ */ new Error(`Failed to load ${p}`));
        }, { once: !0 });
        return;
      }
      const ye = document.createElement("script");
      ye.src = p, ye.async = !1, ye.addEventListener("load", () => {
        ye.dataset.loaded = "true", R();
      }, { once: !0 }), ye.addEventListener("error", () => {
        ye.remove(), ue(/* @__PURE__ */ new Error(`Failed to load ${p}`));
      }, { once: !0 }), document.head.appendChild(ye);
    });
    return o.set(p, S), S.catch(() => {
      o.get(p) === S && o.delete(p);
    }), S;
  }
  async function d() {
    var p, E;
    const I = h(), [q, B, S] = s;
    if (await Promise.all([f(q[0], q[1]), f(S[0], S[1])]), await f(B[0], B[1]), await Promise.all(s.slice(2, 4).map(([R, ue]) => f(R, ue))), !N(a)) {
      const R = document.createElement("script");
      R.textContent = await I, document.body.appendChild(R), ie(a, !0);
    }
    (p = (E = window).setCommentCommunityPageId) === null || p === void 0 || p.call(E, n() || "home");
  }
  $s(() => {
    v("/widgets/comment-widget.css?v=top-comment-snow-4"), window.loadCommentFeatureStyles = c;
    const p = "requestIdleCallback" in window ? window.requestIdleCallback(() => c("effects"), { timeout: 2500 }) : window.setTimeout(() => c("effects"), 2500);
    return d().catch((E) => {
      console.error("Comment widget failed to initialize.", E);
    }), () => {
      typeof p == "number" && window.clearTimeout(p), window.loadCommentFeatureStyles === c && delete window.loadCommentFeatureStyles;
    };
  }), Ji(() => (N(a), Cr(n())), () => {
    if (N(a) && n()) {
      var p, E;
      (p = (E = window).setCommentCommunityPageId) === null || p === void 0 || p.call(E, n());
    }
  }), Qi();
  var m = {
    get pageId() {
      return n();
    },
    set pageId(p) {
      n(p), cn();
    }
  };
  Ms();
  var _ = us(), $ = Hi(_);
  return Ss($, () => Ls), Ar(e, _), Yn(m);
}
customElements.define("mikoroku-comment-widget", Ps(Is, { pageId: {
  attribute: "page-id",
  type: "String"
} }, [], []));
export {
  Is as default
};
