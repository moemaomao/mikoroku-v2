if (typeof window != "undefined") {
  var pn, zt, _n, Dt;
  ((zt = (pn = (Dt = (_n = window).__svelte) !== null && Dt !== void 0 ? Dt : _n.__svelte = {}).v) !== null && zt !== void 0 ? zt : pn.v = /* @__PURE__ */ new Set()).add("5");
}
var Ue = !1, qe = !1;
function Br() {
  qe = !0;
}
Br();
var _e = {}, I = /* @__PURE__ */ Symbol("uninitialized");
var Wr = "http://www.w3.org/2000/svg", zr = "http://www.w3.org/1998/Math/MathML", Dr = Array.isArray, Hr = Array.prototype.indexOf, tt = Array.prototype.includes, Fr = Array.from, kt = Object.keys, nt = Object.defineProperty, Ee = Object.getOwnPropertyDescriptor, Ur = Object.getOwnPropertyDescriptors, qr = Object.prototype, Vr = Array.prototype, Ln = Object.getPrototypeOf, gn = Object.isExtensible, Yr = () => {
};
function Gr(e) {
  return e();
}
function Gt(e) {
  for (var t = 0; t < e.length; t++) e[t]();
}
function In() {
  var e, t;
  return {
    promise: new Promise((n, r) => {
      e = n, t = r;
    }),
    resolve: e,
    reject: t
  };
}
function rt(e) {
  "@babel/helpers - typeof";
  return rt = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
    return typeof t;
  } : function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, rt(e);
}
function Kr(e, t) {
  if (rt(e) != "object" || !e) return e;
  var n = e[Symbol.toPrimitive];
  if (n !== void 0) {
    var r = n.call(e, t || "default");
    if (rt(r) != "object") return r;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
function Xr(e) {
  var t = Kr(e, "string");
  return rt(t) == "symbol" ? t : t + "";
}
function S(e, t, n) {
  return (t = Xr(t)) in e ? Object.defineProperty(e, t, {
    value: n,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : e[t] = n, e;
}
var Ht, Is = 1 << 24, V = 1024, U = 2048, fe = 4096, Rn = 8192, Nn = 16384, Bn = 32768, Kt = 1 << 25, Wn = 65536, Rs = 1 << 17, Ns = 1 << 18, Ve = 1 << 19, zn = 1 << 20, wn = 1 << 21, Zr = 1 << 22, $t = 1 << 23, ze = /* @__PURE__ */ Symbol("$state"), Dn = /* @__PURE__ */ Symbol("component"), Hn = /* @__PURE__ */ Symbol("legacy props"), Jr = /* @__PURE__ */ Symbol("proxy path"), Qr = /* @__PURE__ */ Symbol("attributes"), ei = /* @__PURE__ */ Symbol("class"), ti = /* @__PURE__ */ Symbol("style"), ni = /* @__PURE__ */ Symbol("text"), lt = new class extends Error {
  constructor(...t) {
    super(...t), S(this, "name", "StaleReactionError"), S(this, "message", "The reaction that called `getAbortSignal()` was re-run or destroyed");
  }
}(), Ws = !!(!((Ht = globalThis.document) === null || Ht === void 0) && Ht.contentType) && /* @__PURE__ */ globalThis.document.contentType.includes("xml");
function ri() {
  console.warn("https://svelte.dev/e/derived_inert");
}
function It(e) {
  console.warn("https://svelte.dev/e/hydration_mismatch");
}
function ii() {
  console.warn("https://svelte.dev/e/svelte_boundary_reset_noop");
}
var B = !1;
function vt(e) {
  B = e;
}
var O;
function ge(e) {
  if (e === null)
    throw It(), _e;
  return O = e;
}
function xt() {
  return ge(/* @__PURE__ */ we(O));
}
function si(e = 1) {
  if (B) {
    for (var t = e, n = O; t--; ) n = /* @__PURE__ */ we(n);
    O = n;
  }
}
function oi(e = !0) {
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
function ai(e) {
  if (!e || e.nodeType !== 8)
    throw It(), _e;
  return e.data;
}
function Fn(e) {
  return e === this.v;
}
function li(e, t) {
  return e != e ? t == t : e !== t || e !== null && typeof e == "object" || typeof e == "function";
}
function Un(e) {
  return !li(e, this.v);
}
function ui(e) {
  throw new Error("https://svelte.dev/e/lifecycle_outside_component");
}
function fi() {
  throw new Error("https://svelte.dev/e/async_derived_orphan");
}
function ci(e) {
  throw new Error("https://svelte.dev/e/effect_in_teardown");
}
function di() {
  throw new Error("https://svelte.dev/e/effect_in_unowned_derived");
}
function vi(e) {
  throw new Error("https://svelte.dev/e/effect_orphan");
}
function hi() {
  throw new Error("https://svelte.dev/e/effect_update_depth_exceeded");
}
function pi() {
  throw new Error("https://svelte.dev/e/hydration_failed");
}
function _i(e) {
  throw new Error("https://svelte.dev/e/props_invalid_value");
}
function gi() {
  throw new Error("https://svelte.dev/e/state_descriptors_fixed");
}
function wi() {
  throw new Error("https://svelte.dev/e/state_prototype_fixed");
}
function mi() {
  throw new Error("https://svelte.dev/e/state_unsafe_mutation");
}
function yi() {
  throw new Error("https://svelte.dev/e/svelte_boundary_reset_onerror");
}
function mn(e, t) {
  return e.label = t, bi(e.v, t), e;
}
function bi(e, t) {
  var n;
  return e == null || (n = e[Jr]) === null || n === void 0 || n.call(e, t), e;
}
function yn(e, t) {
  var n = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    t && (r = r.filter(function(i) {
      return Object.getOwnPropertyDescriptor(e, i).enumerable;
    })), n.push.apply(n, r);
  }
  return n;
}
function He(e) {
  for (var t = 1; t < arguments.length; t++) {
    var n = arguments[t] != null ? arguments[t] : {};
    t % 2 ? yn(Object(n), !0).forEach(function(r) {
      S(e, r, n[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : yn(Object(n)).forEach(function(r) {
      Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(n, r));
    });
  }
  return e;
}
var A = null;
function Fe(e) {
  A = e;
}
function qn(e, t = !1, n) {
  A = {
    p: A,
    i: !1,
    c: null,
    e: null,
    s: e,
    x: null,
    r: b,
    l: qe && !t ? {
      s: null,
      u: null,
      $: []
    } : null
  };
}
function Vn(e) {
  var t = A, n = t.e;
  if (n !== null) {
    t.e = null;
    for (var r of n) gr(r);
  }
  if (e !== void 0 && (t.x = e), t.i = !0, A = t.p, 0)
    var i;
  return Yn(e);
}
function Yn(e = {}) {
  return nt(e, Dn, { value: !0 }), e;
}
function ut() {
  return !qe || A !== null && A.l === null;
}
var xe = [];
function Gn() {
  var e = xe;
  xe = [], Gt(e);
}
function Oe(e) {
  if (xe.length === 0 && !Qe) {
    var t = xe;
    queueMicrotask(() => {
      t === xe && Gn();
    });
  }
  xe.push(e);
}
function ki() {
  for (; xe.length > 0; ) Gn();
}
var $i = ~(U | fe | V);
function P(e, t) {
  e.f = e.f & $i | t;
}
function on(e) {
  (e.f & 512) !== 0 || e.deps === null ? P(e, V) : P(e, fe);
}
function Kn(e, t) {
  (e.f & 2048) !== 0 ? t.set(e, U) : (e.f & 4096) !== 0 && t.get(e) !== 2048 && t.set(e, fe), P(e, V);
}
function Rt(e) {
  var t = k, n = b;
  Y(null), G(null);
  try {
    return e();
  } finally {
    Y(t), G(n);
  }
}
function xi(e, t) {
  this.v = e, this.k = t;
}
function ht(e) {
  var t, n;
  function r(s, a) {
    try {
      var o = e[s](a), u = o.value, h = u instanceof xi;
      Promise.resolve(h ? u.v : u).then(function(v) {
        if (h) {
          var f = s === "return" ? "return" : "next";
          if (!u.k || v.done) return r(f, v);
          v = e[f](v).value;
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
ht.prototype[typeof Symbol == "function" && Symbol.asyncIterator || "@@asyncIterator"] = function() {
  return this;
}, ht.prototype.next = function(e) {
  return this._invoke("next", e);
}, ht.prototype.throw = function(e) {
  return this._invoke("throw", e);
}, ht.prototype.return = function(e) {
  return this._invoke("return", e);
};
function Si(e, t, n, r) {
  const i = ut() ? it : Zn;
  var s = e.filter((d) => !d.settled), a = t.map(i);
  if (n.length === 0 && s.length === 0) {
    r(a);
    return;
  }
  var o = b, u = Ei(), h = s.length === 1 ? s[0].promise : s.length > 1 ? Promise.all(s.map((d) => d.promise)) : null;
  function v(d) {
    if ((o.f & 16384) === 0) {
      u();
      try {
        r([...a, ...d]);
      } catch (g) {
        ae(g, o);
      }
      St();
    }
  }
  var f = Xn();
  if (n.length === 0) {
    h.then(() => v([])).finally(f);
    return;
  }
  function c() {
    Promise.all(n.map((d) => /* @__PURE__ */ Ti(d))).then(v).catch((d) => ae(d, o)).finally(f);
  }
  h ? h.then(() => {
    if ((o.f & 16384) !== 0) {
      f();
      return;
    }
    u(), c(), St();
  }) : c();
}
function Ei() {
  var e = b, t = k, n = A, r = m;
  if (0) var i;
  return function(a = !0) {
    G(e), Y(t), Fe(n), a && (e.f & 16384) === 0 && (r == null || r.activate(), r == null || r.apply());
  };
}
var Mi = !1;
function St(e = !0) {
  Mi = !1, G(null), Y(null), Fe(null), e && (m == null || m.deactivate());
}
function Xn() {
  var e = b, t = e.b, n = m, r = !!(t != null && t.is_rendered());
  return t == null || t.update_pending_count(1, n), n.increment(r, e), () => {
    t == null || t.update_pending_count(-1, n), n.decrement(r, e);
  };
}
// @__NO_SIDE_EFFECTS__
function it(e) {
  var t = 2 | U;
  return b !== null && (b.f |= Ve), {
    ctx: A,
    deps: null,
    effects: null,
    equals: Fn,
    f: t,
    fn: e,
    reactions: null,
    rv: 0,
    v: I,
    wv: 0,
    parent: b,
    ac: null
  };
}
var Ke = /* @__PURE__ */ Symbol("obsolete");
// @__NO_SIDE_EFFECTS__
function Ti(e, t, n) {
  let r = b;
  r === null && fi();
  var i = void 0, s = ft(I), a = !k, o = /* @__PURE__ */ new Set();
  return Qi(() => {
    var u = b, h = In();
    i = h.promise;
    try {
      Promise.resolve(e()).then(h.resolve, (p) => {
        p !== lt && h.reject(p);
      }).finally(St);
    } catch (p) {
      h.reject(p), St();
    }
    var v = m;
    if (a) {
      var f;
      if ((u.f & 32768) !== 0) var c = Xn();
      if (!((f = r.b) === null || f === void 0) && f.is_rendered()) {
        var d;
        (d = v.async_deriveds.get(u)) === null || d === void 0 || d.reject(Ke);
      } else for (const p of o.values()) p.reject(Ke);
      o.add(h), v.async_deriveds.set(u, h);
    }
    const g = (p, $ = void 0) => {
      c == null || c(), o.delete(h), $ !== Ke && (v.activate(), $ ? (s.f |= $t, jt(s, $)) : ((s.f & 8388608) !== 0 && (s.f ^= $t), jt(s, p)), v.deactivate());
    };
    h.promise.then(g, (p) => g(null, p || "unknown"));
  }), Yi(() => {
    for (const u of o) u.reject(Ke);
  }), new Promise((u) => {
    function h(v) {
      function f() {
        v === i ? u(s) : h(i);
      }
      v.then(f, f);
    }
    h(i);
  });
}
// @__NO_SIDE_EFFECTS__
function Zn(e) {
  const t = /* @__PURE__ */ it(e);
  return t.equals = Un, t;
}
function Ci(e) {
  var t = e.effects;
  if (t !== null) {
    e.effects = null;
    for (var n = 0; n < t.length; n += 1) Q(t[n]);
  }
}
function an(e) {
  var t, n = b, r = e.parent;
  if (!ue && r !== null && e.v !== I && (r.f & 24576) !== 0)
    return ri(), e.v;
  G(r);
  try {
    Ci(e), t = Sr(e);
  } finally {
    G(n);
  }
  return t;
}
function Jn(e) {
  var t = an(e);
  if (!e.equals(t) && (e.wv = $r(), (!(m != null && m.is_fork) || e.deps === null) && (m !== null ? (m.capture(e, t, !0), ve == null || ve.capture(e, t, !0)) : e.v = t, e.deps === null))) {
    P(e, V);
    return;
  }
  ue || (j !== null ? (dn() || m != null && m.is_fork) && j.set(e, t) : on(e));
}
function Oi(e) {
  if (e.effects !== null) {
    for (const n of e.effects) if (n.teardown || n.ac) {
      var t;
      (t = n.teardown) === null || t === void 0 || t.call(n), n.ac !== null && Rt(() => {
        n.ac.abort(lt), n.ac = null;
      }), n.fn !== null && (n.teardown = Yr), ot(n, 0), vn(n);
    }
  }
}
function Qn(e) {
  if (e.effects !== null)
    for (const t of e.effects) t.teardown && t.fn !== null && Pe(t);
}
function er(e, t) {
  if (t.has(e)) throw new TypeError("Cannot initialize the same private elements twice on an object");
}
function ln(e, t) {
  er(e, t), t.add(e);
}
function x(e, t, n) {
  er(e, t), t.set(e, n);
}
function w(e, t, n) {
  if (typeof e == "function" ? e === t : e.has(t)) return arguments.length < 3 ? t : n;
  throw new TypeError("Private element is not present on this object");
}
function l(e, t) {
  return e.get(w(e, t));
}
function y(e, t, n) {
  return e.set(w(e, t), n), n;
}
var tr, Et = null, Ie = null, m = null, ve = null, j = null, Xt = null, Qe = !1, Ft = !1, st = null, Mt = null, nr = 0;
var Ai = 1, Tt = /* @__PURE__ */ new WeakMap(), pt = /* @__PURE__ */ new WeakMap(), Re = /* @__PURE__ */ new WeakMap(), be = /* @__PURE__ */ new WeakMap(), Xe = /* @__PURE__ */ new WeakMap(), Ae = /* @__PURE__ */ new WeakMap(), Zt = /* @__PURE__ */ new WeakMap(), he = /* @__PURE__ */ new WeakMap(), de = /* @__PURE__ */ new WeakMap(), yt = /* @__PURE__ */ new WeakMap(), Ze = /* @__PURE__ */ new WeakMap(), T = /* @__PURE__ */ new WeakSet(), Ye = class rr {
  constructor() {
    ln(this, T), S(this, "id", Ai++), S(this, "started", !1), S(this, "linked", !0), S(this, "prev", null), S(this, "next", null), S(this, "async_deriveds", /* @__PURE__ */ new Map()), S(this, "current", /* @__PURE__ */ new Map()), S(this, "previous", /* @__PURE__ */ new Map()), x(this, Tt, /* @__PURE__ */ new Set()), x(this, pt, /* @__PURE__ */ new Set()), x(this, Re, 0), x(this, be, /* @__PURE__ */ new Map()), x(this, Xe, null), x(this, Ae, []), x(this, Zt, []), x(this, he, /* @__PURE__ */ new Map()), x(this, de, /* @__PURE__ */ new Map()), x(this, yt, /* @__PURE__ */ new Set()), S(this, "is_fork", !1), x(this, Ze, !1), Ie === null ? Et = Ie = this : (Ie.next = this, this.prev = Ie), Ie = this;
  }
  skip_effect(t) {
    l(de, this).has(t) || l(de, this).set(t, {
      d: [],
      m: []
    }), l(yt, this).delete(t);
  }
  unskip_effect(t, n = (r) => this.schedule(r)) {
    var r = l(de, this).get(t);
    if (r) {
      l(de, this).delete(t);
      for (var i of r.d)
        P(i, U), n(i);
      for (i of r.m)
        P(i, fe), n(i);
    }
    l(yt, this).add(t);
  }
  capture(t, n, r = !1) {
    t.v !== I && !this.previous.has(t) && this.previous.set(t, t.v), (t.f & 8388608) === 0 && (this.current.set(t, [n, r]), j == null || j.set(t, n)), this.is_fork || (t.v = n);
  }
  activate() {
    m = this;
  }
  deactivate() {
    m = null, j = null;
  }
  flush() {
    try {
      Ft = !0, m = this, w(T, this, Ct).call(this);
    } finally {
      nr = 0, Xt = null, st = null, Mt = null, Ft = !1, m = null, j = null, oe.clear();
    }
  }
  discard() {
    var t;
    for (const n of l(pt, this)) n(this);
    l(pt, this).clear();
    for (const n of this.async_deriveds.values()) n.reject(Ke);
    w(T, this, Ot).call(this), (t = l(Xe, this)) === null || t === void 0 || t.resolve();
  }
  register_created_effect(t) {
    l(Zt, this).push(t);
  }
  increment(t, n) {
    if (y(Re, this, l(Re, this) + 1), t) {
      var r;
      let i = (r = l(be, this).get(n)) !== null && r !== void 0 ? r : 0;
      l(be, this).set(n, i + 1);
    }
  }
  decrement(t, n) {
    if (y(Re, this, l(Re, this) - 1), t) {
      var r;
      let i = (r = l(be, this).get(n)) !== null && r !== void 0 ? r : 0;
      i === 1 ? l(be, this).delete(n) : l(be, this).set(n, i - 1);
    }
    l(Ze, this) || (y(Ze, this, !0), Oe(() => {
      y(Ze, this, !1), this.linked && this.flush();
    }));
  }
  transfer_reactions(t) {
    for (const [n, r] of t) this.add_dirty_reaction(n, r);
    t.clear();
  }
  add_dirty_reaction(t, n) {
    (n === 2048 || l(he, this).get(t) !== 2048) && l(he, this).set(t, n);
  }
  oncommit(t) {
    l(Tt, this).add(t);
  }
  ondiscard(t) {
    l(pt, this).add(t);
  }
  settled() {
    var t;
    return ((t = l(Xe, this)) !== null && t !== void 0 ? t : y(Xe, this, In())).promise;
  }
  static ensure() {
    if (m === null) {
      const t = m = new rr();
      !Ft && !Qe && Oe(() => {
        t.started || t.flush();
      });
    }
    return m;
  }
  apply() {
    if (!Ue || !this.is_fork && this.prev === null && this.next === null) {
      j = null;
      return;
    }
    j = /* @__PURE__ */ new Map();
    for (const [t, [n]] of this.current) j.set(t, n);
    for (let t = Et; t !== null; t = t.next)
      if (!(t === this || t.is_fork) && (t.id >= this.id || !w(T, t, or).call(t, this)))
        for (const [n, r] of t.previous) j.has(n) || j.set(n, r);
  }
  schedule(t) {
    var n;
    if (Xt = t, !((n = t.b) === null || n === void 0) && n.is_pending && (t.f & 16777228) !== 0 && (t.f & 32768) === 0) {
      t.b.defer_effect(t);
      return;
    }
    l(Ae, this).push(t);
  }
};
tr = Ye;
function bn() {
  if (this.is_fork) return !0;
  for (const e of l(be, this).keys()) if (!w(T, this, ji).call(this, e)) return !0;
  return !1;
}
function ji(e) {
  for (var t = e; t !== null; t = t.parent) if (l(de, this).has(t)) return !0;
  return !1;
}
function ir() {
  var e = [];
  for (const i of l(Ae, this))
    if (!((i.f & 16384) !== 0 || (i.f & 6144) === 0)) {
      for (var t = i, n = !1; t.parent !== null; ) {
        t = t.parent;
        var r = t.f;
        if ((r & 96) !== 0) {
          if ((r & 1024) === 0) {
            n = !0;
            break;
          }
          t.f ^= V;
        }
      }
      n || e.push(t);
    }
  return y(Ae, this, []), e;
}
function Ct() {
  var e;
  this.started = !0;
  for (const [o, u] of l(he, this))
    P(o, u), this.schedule(o);
  this.apply();
  for (var t = st = [], n = [], r = Mt = []; l(Ae, this).length > 0; ) {
    nr++ > 1e3 && (w(T, this, Ot).call(this), Ri());
    for (const o of w(T, this, ir).call(this)) try {
      w(T, this, sr).call(this, o, t, n);
    } catch (u) {
      throw ur(o), w(T, this, bn).call(this) || this.discard(), u;
    }
  }
  if (m = null, r.length > 0) {
    var i = tr.ensure();
    for (const o of r) i.schedule(o);
  }
  if (st = null, Mt = null, w(T, this, bn).call(this)) {
    w(T, this, Je).call(this, n), w(T, this, Je).call(this, t);
    for (const [o, u] of l(de, this)) lr(o, u);
    r.length > 0 && w(T, m, Ct).call(m);
    return;
  }
  const s = w(T, this, Pi).call(this);
  if (s) {
    w(T, this, Je).call(this, n), w(T, this, Je).call(this, t), w(T, s, Li).call(s, this);
    return;
  }
  l(he, this).clear();
  for (const o of l(Tt, this)) o(this);
  l(Tt, this).clear(), ve = this, kn(n), kn(t), ve = null, (e = l(Xe, this)) === null || e === void 0 || e.resolve();
  var a = m;
  l(Re, this) === 0 && (l(Ae, this).length === 0 || a !== null) && (w(T, this, Ot).call(this), Ue && (w(T, this, Ii).call(this), m = a)), a !== null && (oe.clear(), w(T, a, Ct).call(a));
}
function sr(e, t, n) {
  e.f ^= V;
  for (var r = e.first; r !== null; ) {
    var i = r.f, s = (i & 96) !== 0;
    if (!(s && (i & 1024) !== 0 || (i & 8192) !== 0 || l(de, this).has(r)) && r.fn !== null) {
      s ? r.f ^= V : (i & 4) !== 0 ? t.push(r) : Ue && (i & 16777224) !== 0 ? n.push(r) : Ge(r) && ((i & 16) !== 0 && this.add_dirty_reaction(r, fe), Pe(r));
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
function Pi() {
  for (var e = this.prev; e !== null; e = e.prev) if (!e.is_fork && w(T, this, or).call(this, e)) return e;
  return null;
}
function or(e) {
  for (const [t, [, n]] of this.current)
    if (!n && e.current.has(t))
      return !0;
  return !1;
}
function Li(e) {
  for (const [n, r] of e.current)
    !this.previous.has(n) && e.previous.has(n) && this.previous.set(n, e.previous.get(n)), this.current.set(n, r);
  for (const [n, r] of e.async_deriveds) {
    const i = this.async_deriveds.get(n);
    i && r.promise.then(i.resolve).catch(i.reject);
  }
  e.async_deriveds.clear(), this.transfer_reactions(l(he, e));
  const t = (n) => {
    var r = n.reactions;
    if (r !== null && !((n.f & 2) !== 0 && (n.f & 6144) === 0))
      for (const a of r) {
        var i = a.f;
        if ((i & 2) !== 0) t(a);
        else {
          var s = a;
          i & 4194320 && !this.async_deriveds.has(s) && (l(he, this).delete(s), P(s, U), this.schedule(s));
        }
      }
  };
  for (const n of this.current.keys()) t(n);
  this.oncommit(() => e.discard()), w(T, e, Ot).call(e), m = this, w(T, this, Ct).call(this);
}
function Je(e) {
  for (var t = 0; t < e.length; t += 1) Kn(e[t], l(he, this));
}
function Ii() {
  for (let v = Et; v !== null; v = v.next) {
    var e = v.id < this.id, t = [];
    for (const [f, [c, d]] of this.current) {
      if (v.current.has(f)) {
        var n = v.current.get(f)[0];
        if (e && c !== n) v.current.set(f, [c, d]);
        else continue;
      }
      t.push(f);
    }
    if (e) for (const [f, c] of this.async_deriveds) {
      const d = v.async_deriveds.get(f);
      d && c.promise.then(d.resolve).catch(d.reject);
    }
    var r = [...v.current.keys()].filter((f) => !v.current.get(f)[1]);
    if (!(!v.started || r.length === 0)) {
      var i = r.filter((f) => !this.current.has(f));
      if (i.length === 0)
        e && v.discard();
      else if (t.length > 0) {
        if (e) for (const f of l(yt, this)) v.unskip_effect(f, (c) => {
          (c.f & 4194320) !== 0 ? v.schedule(c) : w(T, v, Je).call(v, [c]);
        });
        v.activate();
        var s = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Map();
        for (var o of t) ar(o, i, s, a);
        a = /* @__PURE__ */ new Map();
        var u = [...v.current].filter(([f, c]) => {
          const d = this.current.get(f);
          return d ? d[0] !== c[0] || d[1] !== c[1] : !0;
        }).map(([f]) => f);
        if (u.length > 0)
          for (const f of l(Zt, this)) (f.f & 155648) === 0 && fn(f, u, a) && ((f.f & 4194320) !== 0 ? (P(f, U), v.schedule(f)) : v.add_dirty_reaction(f, U));
        if (l(Ae, v).length > 0 && !l(Ze, v)) {
          v.apply();
          for (var h of w(T, v, ir).call(v)) w(T, v, sr).call(v, h, [], []);
        }
        v.deactivate();
      }
    }
  }
}
function Ot() {
  if (this.linked) {
    var e = this.prev, t = this.next;
    e === null ? Et = t : e.next = t, t === null ? Ie = e : t.prev = e, this.linked = !1;
  }
}
function un(e) {
  var t = Qe, n = ve;
  ve = null, Qe = !0;
  try {
    var r;
    for (e && (un(), r = e()); ; ) {
      if (ki(), m === null) return r;
      m.flush();
    }
  } finally {
    Qe = t, ve = n;
  }
}
function Ri() {
  if (0) {
    var e;
    for (const r of m.current.keys()) {
      var t;
      for (const [i, s] of (t = r.updated) !== null && t !== void 0 ? t : [])
        var n;
    }
  }
  try {
    hi();
  } catch (r) {
    ae(r, Xt);
  }
}
var X = null;
function kn(e) {
  var t = e.length;
  if (t !== 0) {
    for (var n = 0; n < t; ) {
      var r = e[n++];
      if ((r.f & 24576) === 0 && Ge(r) && (X = /* @__PURE__ */ new Set(), Pe(r), r.deps === null && r.first === null && r.nodes === null && r.teardown === null && r.ac === null && yr(r), (X == null ? void 0 : X.size) > 0)) {
        oe.clear();
        for (const i of X) {
          if ((i.f & 24576) !== 0) continue;
          const s = [i];
          let a = i.parent;
          for (; a !== null; )
            X.has(a) && (X.delete(a), s.push(a)), a = a.parent;
          for (let o = s.length - 1; o >= 0; o--) {
            const u = s[o];
            (u.f & 24576) === 0 && Pe(u);
          }
        }
        X.clear();
      }
    }
    X = null;
  }
}
function ar(e, t, n, r) {
  if (!n.has(e) && (n.add(e), e.reactions !== null))
    for (const i of e.reactions) {
      const s = i.f;
      (s & 2) !== 0 ? ar(i, t, n, r) : (s & 4194320) !== 0 && (s & 2048) === 0 && fn(i, t, r) && (P(i, U), cn(i));
    }
}
function fn(e, t, n) {
  const r = n.get(e);
  if (r !== void 0) return r;
  if (e.deps !== null) for (const i of e.deps) {
    if (tt.call(t, i)) return !0;
    if ((i.f & 2) !== 0 && fn(i, t, n))
      return n.set(i, !0), !0;
  }
  return n.set(e, !1), !1;
}
function cn(e) {
  m.schedule(e);
}
function lr(e, t) {
  if (!((e.f & 32) !== 0 && (e.f & 1024) !== 0)) {
    (e.f & 2048) !== 0 ? t.d.push(e) : (e.f & 4096) !== 0 && t.m.push(e), P(e, V);
    for (var n = e.first; n !== null; )
      lr(n, t), n = n.next;
  }
}
function ur(e) {
  P(e, V);
  for (var t = e.first; t !== null; )
    ur(t), t = t.next;
}
var At = /* @__PURE__ */ new Set(), oe = /* @__PURE__ */ new Map();
var fr = !1;
function ft(e, t) {
  var n = {
    f: 0,
    v: e,
    reactions: null,
    equals: Fn,
    rv: 0,
    wv: 0
  };
  return n;
}
// @__NO_SIDE_EFFECTS__
function ce(e, t) {
  const n = ft(e, t);
  return is(n), n;
}
// @__NO_SIDE_EFFECTS__
function cr(e, t = !1, n = !0) {
  const r = ft(e);
  if (t || (r.equals = Un), qe && n && A !== null && A.l !== null) {
    var i, s;
    ((s = (i = A.l).s) !== null && s !== void 0 ? s : i.s = []).push(r);
  }
  return r;
}
function ie(e, t, n = !1) {
  k !== null && (!Z || (k.f & 131072) !== 0) && ut() && (k.f & 4325394) !== 0 && (ee === null || !ee.has(e)) && mi();
  let r = n ? We(t) : t;
  return jt(e, r, Mt);
}
var ke = null, Jt = 0;
function jt(e, t, n = null) {
  if (!e.equals(t)) {
    ue ? oe.set(e, t) : oe.has(e) || oe.set(e, e.v);
    var r = Ye.ensure();
    if (r.capture(e, t), 0 && (tracing_mode_flag || b !== null))
      var i, s, a;
    if ((e.f & 2) !== 0) {
      const o = e;
      (e.f & 2048) !== 0 && an(o), j === null && on(o);
    }
    e.wv = $r(), ke = null, Jt = 0, dr(e, U, n), ke = null, ut() && b !== null && (b.f & 1024) !== 0 && (b.f & 96) === 0 && (q === null ? ss([e]) : q.push(e)), !r.is_fork && At.size > 0 && !fr && Ni();
  }
  return t;
}
function Ni() {
  fr = !1;
  for (const e of At) {
    (e.f & 1024) !== 0 && P(e, fe);
    let t;
    try {
      t = Ge(e);
    } catch (n) {
      t = !0;
    }
    t && Pe(e);
  }
  At.clear();
}
function et(e) {
  ie(e, e.v + 1);
}
function dr(e, t, n) {
  var r = e.reactions;
  if (r !== null) {
    var i = ut(), s = r.length;
    if (Jt += s, Jt > 1e5 && ke === null && (ke = /* @__PURE__ */ new Set()), ke !== null) {
      if (ke.has(e)) return;
      ke.add(e);
    }
    for (var a = 0; a < s; a++) {
      var o = r[a], u = o.f;
      if (!(!i && o === b)) {
        var h = (u & U) === 0;
        if (h && P(o, t), (u & 131072) !== 0) At.add(o);
        else if ((u & 2) !== 0) {
          var v = o;
          j == null || j.delete(v), dr(v, fe, n);
        } else if (h) {
          var f = o;
          (u & 16) !== 0 && X !== null && X.add(f), n !== null ? n.push(f) : cn(f);
        }
      }
    }
  }
}
var Bi = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;
function We(e) {
  if (typeof e != "object" || e === null || ze in e || Dn in e) return e;
  const t = Ln(e);
  if (t !== qr && t !== Vr) return e;
  var n = /* @__PURE__ */ new Map(), r = Dr(e), i = /* @__PURE__ */ ce(0), s = null, a = Me, o = (f) => {
    if (Me === a) return f();
    var c = k, d = Me;
    Y(null), Sn(a);
    var g = f();
    return Y(c), Sn(d), g;
  };
  r && n.set("length", /* @__PURE__ */ ce(e.length, s));
  var u = "";
  let h = !1;
  function v(f) {
    if (!h) {
      h = !0, u = f, mn(i, `${u} version`);
      for (const [c, d] of n) mn(d, Wi(u, c));
      h = !1;
    }
  }
  return new Proxy(e, {
    defineProperty(f, c, d) {
      (!("value" in d) || d.configurable === !1 || d.enumerable === !1 || d.writable === !1) && gi();
      var g = n.get(c);
      return g === void 0 ? o(() => {
        var p = /* @__PURE__ */ ce(d.value, s);
        return n.set(c, p), p;
      }) : ie(g, d.value, !0), !0;
    },
    deleteProperty(f, c) {
      var d = n.get(c);
      if (d === void 0) {
        if (c in f) {
          const g = o(() => /* @__PURE__ */ ce(I, s));
          n.set(c, g), et(i);
        }
      } else
        ie(d, I), et(i);
      return !0;
    },
    get(f, c, d) {
      var g;
      if (c === ze) return e;
      var p = n.get(c), $ = c in f;
      if (p === void 0 && (!$ || !((g = Ee(f, c)) === null || g === void 0) && g.writable) && (p = o(() => {
        var E = We($ ? f[c] : I), R = /* @__PURE__ */ ce(E, s);
        return R;
      }), n.set(c, p)), p !== void 0) {
        var _ = N(p);
        return _ === I ? void 0 : _;
      }
      return Reflect.get(f, c, d);
    },
    getOwnPropertyDescriptor(f, c) {
      var d;
      (d = this.has) === null || d === void 0 || d.call(this, f, c);
      var g = Reflect.getOwnPropertyDescriptor(f, c), p = n.get(c);
      if (p !== void 0) {
        var $ = N(p);
        if ($ === I) return;
        if (g && "value" in g) g.value = $;
        else return {
          enumerable: !0,
          configurable: !0,
          value: $,
          writable: !0
        };
      }
      return g;
    },
    has(f, c) {
      var d;
      if (c === ze) return !0;
      var g = n.get(c), p = g !== void 0 && g.v !== I || Reflect.has(f, c);
      return (g !== void 0 || (b !== null || k !== null) && (!p || !((d = Ee(f, c)) === null || d === void 0) && d.writable)) && (g === void 0 && (g = o(() => {
        var $ = p ? We(f[c]) : I, _ = /* @__PURE__ */ ce($, s);
        return _;
      }), n.set(c, g)), N(g) === I) ? !1 : p;
    },
    set(f, c, d, g) {
      var p = n.get(c), $ = c in f;
      if (r && c === "length") for (var _ = d; _ < p.v; _ += 1) {
        var E = n.get(_ + "");
        E !== void 0 ? ie(E, I) : _ in f && (E = o(() => /* @__PURE__ */ ce(I, s)), n.set(_ + "", E));
      }
      if (p === void 0) {
        var R;
        (!$ || !((R = Ee(f, c)) === null || R === void 0) && R.writable) && (p = o(() => /* @__PURE__ */ ce(void 0, s)), ie(p, We(d)), n.set(c, p));
      } else {
        $ = p.v !== I;
        var D = o(() => We(d));
        ie(p, D);
      }
      var K = Reflect.getOwnPropertyDescriptor(f, c);
      if (K != null && K.set && K.set.call(g, d), !$) {
        if (r && typeof c == "string") {
          var M = n.get("length"), L = Number(c);
          Number.isInteger(L) && L >= M.v && ie(M, L + 1);
        }
        et(i);
      }
      return !0;
    },
    ownKeys(f) {
      N(i);
      var c = Reflect.ownKeys(f).filter((p) => {
        var $ = n.get(p);
        return $ === void 0 || $.v !== I;
      });
      for (var [d, g] of n) g.v !== I && !(d in f) && c.push(d);
      return c;
    },
    setPrototypeOf() {
      wi();
    }
  });
}
function Wi(e, t) {
  var n;
  return typeof t == "symbol" ? `${e}[Symbol(${(n = t.description) !== null && n !== void 0 ? n : ""})]` : Bi.test(t) ? `${e}.${t}` : /^\d+$/.test(t) ? `${e}[${t}]` : `${e}['${t}']`;
}
var $n, zi, Di, vr, hr;
function Qt() {
  if ($n === void 0) {
    $n = window, zi = document, Di = /Firefox/.test(navigator.userAgent);
    var e = Element.prototype, t = Node.prototype, n = Text.prototype;
    vr = Ee(t, "firstChild").get, hr = Ee(t, "nextSibling").get, gn(e) && (e[ei] = void 0, e[Qr] = null, e[ti] = void 0, e.__e = void 0), gn(n) && (n[ni] = void 0);
  }
}
function Nt(e = "") {
  return document.createTextNode(e);
}
// @__NO_SIDE_EFFECTS__
function $e(e) {
  return vr.call(e);
}
// @__NO_SIDE_EFFECTS__
function we(e) {
  return hr.call(e);
}
function Hi(e, t = !1) {
  if (!B) {
    var n = /* @__PURE__ */ $e(e);
    return n instanceof Comment && n.data === "" ? /* @__PURE__ */ we(n) : n;
  }
  if (t) {
    if ((O == null ? void 0 : O.nodeType) !== 3) {
      var r = Nt();
      return O == null || O.before(r), ge(r), r;
    }
    Ui(O);
  }
  return O;
}
function Fi(e) {
  e.textContent = "";
}
function pr(e, t, n) {
  return t == null || t === "http://www.w3.org/1999/xhtml" ? n ? document.createElement(e, { is: n }) : document.createElement(e) : n ? document.createElementNS(t, e, { is: n }) : document.createElementNS(t, e);
}
function Ui(e) {
  if (e.nodeValue.length < 65536) return;
  let t = e.nextSibling;
  for (; t !== null && t.nodeType === 3; )
    t.remove(), e.nodeValue += t.nodeValue, t = e.nextSibling;
}
function qi(e) {
  var t = b;
  if (t === null)
    return k.f |= $t, e;
  if ((t.f & 32768) === 0 && (t.f & 4) === 0)
    throw e;
  ae(e, t);
}
function ae(e, t) {
  if (e === _e) throw e;
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
function _r(e) {
  b === null && (k === null && vi(e), di()), ue && ci(e);
}
function Vi(e, t) {
  var n = t.last;
  n === null ? t.last = t.first = e : (n.next = e, e.prev = n, t.last = e);
}
function le(e, t) {
  var n = b;
  n !== null && (n.f & 8192) !== 0 && (e |= Rn);
  var r = {
    ctx: A,
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
  m == null || m.register_created_effect(r);
  var i = r;
  if ((e & 4) !== 0)
    st !== null ? st.push(r) : Ye.ensure().schedule(r);
  else if (t !== null) {
    try {
      Pe(r);
    } catch (o) {
      throw Q(r), o;
    }
    i.deps === null && i.teardown === null && i.nodes === null && i.first === i.last && (i.f & 524288) === 0 && (i = i.first, (e & 16) !== 0 && (e & 65536) !== 0 && i !== null && (i.f |= Wn));
  }
  if (i !== null && (i.parent = n, n !== null && Vi(i, n), k !== null && (k.f & 2) !== 0 && (e & 64) === 0)) {
    var s, a = k;
    ((s = a.effects) !== null && s !== void 0 ? s : a.effects = []).push(i);
  }
  return r;
}
function dn() {
  return k !== null && !Z;
}
function Yi(e) {
  const t = le(8, null);
  return P(t, V), t.teardown = e, t;
}
function en(e) {
  _r("$effect");
  var t = b.f;
  if (!k && (t & 32) !== 0 && A !== null && !A.i) {
    var n, r = A;
    ((n = r.e) !== null && n !== void 0 ? n : r.e = []).push(e);
  } else return gr(e);
}
function gr(e) {
  return le(4 | zn, e);
}
function Gi(e) {
  return _r("$effect.pre"), le(8 | zn, e);
}
function Ki(e) {
  Ye.ensure();
  const t = le(64 | Ve, e);
  return () => {
    Q(t);
  };
}
function Xi(e) {
  Ye.ensure();
  const t = le(64 | Ve, e);
  return (n = {}) => new Promise((r) => {
    n.outro ? Wt(t, () => {
      Q(t), r(void 0);
    }) : (Q(t), r(void 0));
  });
}
function Zi(e, t) {
  var n = A, r = {
    effect: null,
    ran: !1,
    deps: e
  };
  n.l.$.push(r), r.effect = Bt(() => {
    if (e(), !r.ran) {
      r.ran = !0;
      var i = b;
      try {
        G(i.parent), ct(t);
      } finally {
        G(i);
      }
    }
  });
}
function Ji() {
  var e = A;
  Bt(() => {
    for (var t of e.l.$) {
      t.deps();
      var n = t.effect;
      (n.f & 1024) !== 0 && n.deps !== null && P(n, fe), Ge(n) && Pe(n), t.ran = !1;
    }
  });
}
function Qi(e) {
  return le(Zr | Ve, e);
}
function Bt(e, t = 0) {
  return le(8 | t, e);
}
function es(e, t = [], n = [], r = []) {
  Si(r, t, n, (i) => {
    le(8, () => {
      e(...i.map(N));
    });
  });
}
function ts(e, t = 0) {
  var n = le(16 | t, e);
  return n;
}
function je(e) {
  return le(32 | Ve, e);
}
function wr(e) {
  var t = e.teardown;
  if (t !== null) {
    const n = ue, r = k;
    xn(!0), Y(null);
    try {
      t.call(null);
    } catch (i) {
      ae(i, e.parent);
    } finally {
      xn(n), Y(r);
    }
  }
}
function vn(e, t = !1) {
  var n = e.first;
  for (e.first = e.last = null; n !== null; ) {
    const i = n.ac;
    i !== null && Rt(() => {
      i.abort(lt);
    });
    var r = n.next;
    (n.f & 64) !== 0 ? n.parent = null : Q(n, t), n = r;
  }
}
function ns(e) {
  for (var t = e.first; t !== null; ) {
    var n = t.next;
    (t.f & 32) === 0 && Q(t), t = n;
  }
}
function Q(e, t = !0) {
  var n = !1;
  (t || (e.f & 262144) !== 0) && e.nodes !== null && e.nodes.end !== null && (mr(e.nodes.start, e.nodes.end), n = !0), e.f |= Kt, vn(e, t && !n), ot(e, 0);
  var r = e.nodes && e.nodes.t;
  if (r !== null) for (const s of r) s.stop();
  wr(e), e.f ^= Kt, e.f |= Nn;
  var i = e.parent;
  i !== null && i.first !== null && yr(e), e.next = e.prev = e.teardown = e.ctx = e.deps = e.fn = e.nodes = e.ac = e.b = null;
}
function mr(e, t) {
  for (; e !== null; ) {
    var n = e === t ? null : /* @__PURE__ */ we(e);
    e.remove(), e = n;
  }
}
function yr(e) {
  var t = e.parent, n = e.prev, r = e.next;
  n !== null && (n.next = r), r !== null && (r.prev = n), t !== null && (t.first === e && (t.first = r), t.last === e && (t.last = n));
}
function Wt(e, t, n = !0) {
  var r = [];
  e.f |= 256, br(e, r, !0);
  var i = () => {
    n && Q(e), t && t();
  }, s = r.length;
  if (s > 0) {
    var a = () => --s || i();
    for (var o of r) o.out(a);
  } else i();
}
function br(e, t, n) {
  if ((e.f & 8192) === 0) {
    e.f ^= Rn;
    var r = e.nodes && e.nodes.t;
    if (r !== null)
      for (const o of r) (o.is_global || n) && t.push(o);
    for (var i = e.first; i !== null; ) {
      var s = i.next;
      if ((i.f & 64) === 0) {
        var a = (i.f & 65536) !== 0 || (i.f & 32) !== 0 && (e.f & 16) !== 0;
        br(i, t, a ? n : !1);
      }
      i = s;
    }
  }
}
function rs(e, t) {
  if (e.nodes)
    for (var n = e.nodes.start, r = e.nodes.end; n !== null; ) {
      var i = n === r ? null : /* @__PURE__ */ we(n);
      t.append(n), n = i;
    }
}
var Ut = null, ue = !1;
function xn(e) {
  ue = e;
}
var k = null, Z = !1;
function Y(e) {
  k = e;
}
var b = null;
function G(e) {
  b = e;
}
var ee = null;
function is(e) {
  if (k !== null && (!Ue && (k.f & 2097152) !== 0 || (k.f & 2) !== 0)) {
    var t;
    ((t = ee) !== null && t !== void 0 ? t : ee = /* @__PURE__ */ new Set()).add(e);
  }
}
var W = null, H = 0, q = null;
function ss(e) {
  q = e;
}
var kr = 1, Se = 0, Me = Se;
function Sn(e) {
  Me = e;
}
function $r() {
  return ++kr;
}
function Ge(e) {
  var t = e.f;
  if ((t & 2048) !== 0) return !0;
  if ((t & 4096) !== 0) {
    for (var n = e.deps, r = n.length, i = 0; i < r; i++) {
      var s = n[i];
      if (Ge(s) && Jn(s), s.wv > e.wv) return !0;
    }
    (t & 512) !== 0 && j === null && P(e, V);
  }
  return !1;
}
function xr(e, t, n = !0) {
  var r = e.reactions;
  if (r !== null && !(!Ue && ee !== null && ee.has(e)))
    for (var i = 0; i < r.length; i++) {
      var s = r[i];
      (s.f & 2) !== 0 ? xr(s, t, !1) : t === s && (n ? P(s, U) : (s.f & 1024) !== 0 && P(s, fe), cn(s));
    }
}
function Sr(e) {
  var t = W, n = H, r = q, i = k, s = ee, a = A, o = Z, u = Me, h = e.f;
  W = null, H = 0, q = null, k = (h & 96) === 0 ? e : null, ee = null, Fe(e.ctx), Z = !1, Me = ++Se, e.ac !== null && (Rt(() => {
    e.ac.abort(lt);
  }), e.ac = null);
  try {
    e.f |= wn;
    var v = e.fn, f = v();
    e.f |= Bn;
    var c = En(e);
    if (ut() && q !== null && !Z && c !== null && (e.f & 6146) === 0) for (var d = 0; d < q.length; d++) xr(q[d], e);
    if (i !== null && i !== e) {
      if (Se++, i.deps !== null) for (let g = 0; g < n; g += 1) i.deps[g].rv = Se;
      if (t !== null) for (const g of t) g.rv = Se;
      q !== null && (r === null ? r = q : r.push(...q));
    }
    return (e.f & 8388608) !== 0 && (e.f ^= $t), f;
  } catch (g) {
    return En(e), qi(g);
  } finally {
    e.f ^= wn, W = t, H = n, q = r, k = i, ee = s, Fe(a), Z = o, Me = u;
  }
}
function En(e) {
  var t = e.deps, n = m == null ? void 0 : m.is_fork;
  if (W !== null) {
    var r;
    if (n || ot(e, H), t !== null && H > 0)
      for (t.length = H + W.length, r = 0; r < W.length; r++) t[H + r] = W[r];
    else e.deps = t = W;
    if (dn() && (e.f & 512) !== 0) for (r = H; r < t.length; r++) {
      var i, s;
      ((s = (i = t[r]).reactions) !== null && s !== void 0 ? s : i.reactions = []).push(e);
    }
  } else !n && t !== null && H < t.length && (ot(e, H), t.length = H);
  return t;
}
function os(e, t) {
  let n = t.reactions;
  if (n !== null) {
    var r = Hr.call(n, e);
    if (r !== -1) {
      var i = n.length - 1;
      i === 0 ? n = t.reactions = null : (n[r] = n[i], n.pop());
    }
  }
  if (n === null && (t.f & 2) !== 0 && (W === null || !tt.call(W, t))) {
    var s = t;
    (s.f & 512) !== 0 && (s.f ^= 512), s.v !== I && on(s), s.ac !== null && Rt(() => {
      s.ac.abort(lt), s.ac = null, P(s, U);
    }), Oi(s), ot(s, 0);
  }
}
function ot(e, t) {
  var n = e.deps;
  if (n !== null)
    for (var r = t; r < n.length; r++) os(e, n[r]);
}
function Pe(e) {
  var t = e.f;
  if ((t & 16384) === 0) {
    P(e, V);
    var n = b;
    if (b = e, 0)
      var r, i, s;
    try {
      (t & 16777232) !== 0 ? ns(e) : vn(e), wr(e);
      var a = Sr(e);
      if (e.teardown = typeof a == "function" ? a : null, e.wv = kr, 0)
        for (var o of e.deps) ;
    } finally {
      b = n;
    }
  }
}
function N(e) {
  var t = (e.f & 2) !== 0;
  if (Ut == null || Ut.add(e), k !== null && !Z && !(b !== null && (b.f & 16384) !== 0) && (ee === null || !ee.has(e))) {
    var n = k.deps;
    if ((k.f & 2097152) !== 0)
      e.rv < Se && (e.rv = Se, W === null && n !== null && n[H] === e ? H++ : W === null ? W = [e] : W.push(e));
    else {
      var r, i;
      (i = (r = k).deps) !== null && i !== void 0 || (r.deps = []), tt.call(k.deps, e) || k.deps.push(e);
      var s = e.reactions;
      s === null ? e.reactions = [k] : tt.call(s, k) || s.push(k);
    }
  }
  if (0) {
    if (!Z && reactivity_loss_tracker && m === null && ve === null && !reactivity_loss_tracker.warned && (reactivity_loss_tracker.effect.f & 2097152) === 0 && !reactivity_loss_tracker.effect_deps.has(e))
      var a;
    if (tracing_mode_flag && !Z && tracing_expressions !== null && k !== null && tracing_expressions.reaction === k && !e.trace) {
      if (a)
        var o, u;
    }
  }
  if (ue && oe.has(e)) return oe.get(e);
  if (t) {
    var h = e;
    if (ue) {
      var v = h.v;
      return ((h.f & 1024) === 0 && h.reactions !== null || Mr(h)) && (v = an(h)), oe.set(h, v), v;
    }
    var f = (h.f & 512) === 0 && !Z && k !== null && (k.f & 512) !== 0, c = (h.f & Bn) === 0;
    Ge(h) && (f && (h.f |= 512), Jn(h)), f && !c && (Qn(h), Er(h));
  }
  if (j != null && j.has(e)) return j.get(e);
  if ((e.f & 8388608) !== 0) throw e.v;
  return e.v;
}
function Er(e) {
  if (e.f |= 512, e.deps !== null)
    for (const n of e.deps) {
      var t = n.reactions;
      t === null ? n.reactions = [e] : tt.call(t, e) || t.push(e), (n.f & 2) !== 0 && (n.f & 512) === 0 && (Qn(n), Er(n));
    }
}
function Mr(e) {
  if (e.v === I) return !0;
  if (e.deps === null) return !1;
  for (const t of e.deps)
    if (oe.has(t) || (t.f & 2) !== 0 && Mr(t)) return !0;
  return !1;
}
function ct(e) {
  var t = Z;
  try {
    return Z = !0, e();
  } finally {
    Z = t;
  }
}
function Tr(e) {
  if (!(typeof e != "object" || !e || e instanceof EventTarget)) {
    if (ze in e) tn(e);
    else if (!Array.isArray(e)) for (let t in e) {
      const n = e[t];
      typeof n == "object" && n && ze in n && tn(n);
    }
  }
}
function tn(e, t = /* @__PURE__ */ new Set()) {
  if (typeof e == "object" && e !== null && !(e instanceof EventTarget) && !t.has(e)) {
    t.add(e), e instanceof Date && e.getTime();
    for (let r in e) try {
      tn(e[r], t);
    } catch (i) {
    }
    const n = Ln(e);
    if (n !== Object.prototype && n !== Array.prototype && n !== Map.prototype && n !== Set.prototype && n !== Date.prototype) {
      const r = Ur(n);
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
var _t = /* @__PURE__ */ Symbol("events"), as = /* @__PURE__ */ new Set(), Mn = /* @__PURE__ */ new Set(), qt = null, Vt = !1;
function Tn(e) {
  var t, n = this, r = n.ownerDocument, i = e.type, s = ((t = e.composedPath) === null || t === void 0 ? void 0 : t.call(e)) || [], a = s[0] || e.target;
  qt = e, Vt || (Vt = !0, setTimeout(() => {
    Vt = !1, qt = null;
  }));
  var o = 0, u = qt === e && e[_t];
  if (u) {
    var h = s.indexOf(u);
    if (h !== -1 && (n === document || n === window)) {
      e[_t] = n;
      return;
    }
    var v = s.indexOf(n);
    if (v === -1) return;
    h <= v && (o = h);
  }
  if (a = s[o] || e.target, a !== n) {
    nt(e, "currentTarget", {
      configurable: !0,
      get() {
        return a || r;
      }
    });
    var f = k, c = b;
    Y(null), G(null);
    try {
      for (var d, g = []; a !== null && a !== n; ) {
        try {
          var p, $ = (p = a[_t]) === null || p === void 0 ? void 0 : p[i];
          $ != null && (!a.disabled || e.target === a) && $.call(a, e);
        } catch (_) {
          d ? g.push(_) : d = _;
        }
        if (e.cancelBubble) break;
        o++, a = o < s.length ? s[o] : null;
      }
      if (d) {
        for (let _ of g) queueMicrotask(() => {
          throw _;
        });
        throw d;
      }
    } finally {
      e[_t] = n, delete e.currentTarget, Y(f), G(c);
    }
  }
}
var Le, zs = ((Le = globalThis) === null || Le === void 0 || (Le = Le.window) === null || Le === void 0 ? void 0 : Le.trustedTypes) && /* @__PURE__ */ globalThis.window.trustedTypes.createPolicy("svelte-trusted-html", { createHTML: (e) => e });
function De(e, t) {
  var n = b;
  n.nodes === null && (n.nodes = {
    start: e,
    end: t,
    a: null,
    t: null
  });
}
function ls() {
  if (B)
    return De(O, null), O;
  var e = document.createDocumentFragment(), t = document.createComment(""), n = Nt();
  return e.append(t, n), De(t, n), e;
}
function Cr(e, t) {
  if (B) {
    var n = b;
    ((n.f & 32768) === 0 || n.nodes.end === null) && (n.nodes.end = O), xt();
    return;
  }
  e !== null && e.before(t);
}
var us = [
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
], Ds = [
  ...us,
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
function cs(e) {
  return fs.includes(e);
}
var ds = [
  "$state",
  "$state.raw",
  "$derived",
  "$derived.by"
], Hs = [
  ...ds,
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
function vs(e) {
  let t = 0, n = ft(0), r;
  return () => {
    dn() && (N(n), Bt(() => (t === 0 && (r = ct(() => e(() => et(n)))), t += 1, () => {
      Oe(() => {
        t -= 1, t === 0 && (r == null || r(), r = void 0, et(n));
      });
    })));
  };
}
var hs = Wn | Ve;
function ps(e, t, n, r) {
  new _s(e, t, n, r);
}
var te = /* @__PURE__ */ new WeakMap(), nn = /* @__PURE__ */ new WeakMap(), se = /* @__PURE__ */ new WeakMap(), at = /* @__PURE__ */ new WeakMap(), z = /* @__PURE__ */ new WeakMap(), ne = /* @__PURE__ */ new WeakMap(), F = /* @__PURE__ */ new WeakMap(), J = /* @__PURE__ */ new WeakMap(), pe = /* @__PURE__ */ new WeakMap(), Ne = /* @__PURE__ */ new WeakMap(), Te = /* @__PURE__ */ new WeakMap(), gt = /* @__PURE__ */ new WeakMap(), rn = /* @__PURE__ */ new WeakMap(), me = /* @__PURE__ */ new WeakMap(), Cn = /* @__PURE__ */ new WeakMap(), C = /* @__PURE__ */ new WeakSet(), _s = class {
  constructor(e, t, n, r) {
    var i, s;
    ln(this, C), S(this, "parent", void 0), S(this, "is_pending", !1), S(this, "transform_error", void 0), x(this, te, void 0), x(this, nn, B ? O : null), x(this, se, void 0), x(this, at, void 0), x(this, z, void 0), x(this, ne, null), x(this, F, null), x(this, J, null), x(this, pe, null), x(this, Ne, 0), x(this, Te, 0), x(this, gt, !1), x(this, rn, /* @__PURE__ */ new Map()), x(this, me, null), x(this, Cn, vs(() => (y(me, this, ft(l(Ne, this))), () => {
      y(me, this, null);
    }))), y(te, this, e), y(se, this, t), y(at, this, (a) => {
      var o = b;
      o.b = this, o.f |= 128, n(a);
    }), this.parent = b.b, this.transform_error = (i = r != null ? r : (s = this.parent) === null || s === void 0 ? void 0 : s.transform_error) !== null && i !== void 0 ? i : ((a) => a), y(z, this, ts(() => {
      if (B) {
        const a = ai(l(nn, this));
        xt();
        const o = a === "[!";
        if (a.startsWith("[?")) {
          const u = JSON.parse(a.slice(2));
          w(C, this, ws).call(this, u);
        } else o ? w(C, this, ms).call(this) : w(C, this, gs).call(this);
      } else w(C, this, Ar).call(this);
    }, hs)), B && y(te, this, O);
  }
  defer_effect(e) {
    Kn(e, l(rn, this));
  }
  is_rendered() {
    return !this.is_pending && (!this.parent || this.parent.is_rendered());
  }
  has_pending_snippet() {
    return !!l(se, this).pending;
  }
  update_pending_count(e, t) {
    w(C, this, jr).call(this, e, t), y(Ne, this, l(Ne, this) + e), !(!l(me, this) || l(gt, this)) && (y(gt, this, !0), Oe(() => {
      y(gt, this, !1), l(me, this) && jt(l(me, this), l(Ne, this));
    }));
  }
  get_effect_pending() {
    return l(Cn, this).call(this), N(l(me, this));
  }
  error(e) {
    if (e === _e || !l(se, this).onerror && !l(se, this).failed) throw e;
    m != null && m.is_fork ? (l(ne, this) && m.skip_effect(l(ne, this)), l(F, this) && m.skip_effect(l(F, this)), l(J, this) && m.skip_effect(l(J, this)), m.oncommit(() => {
      w(C, this, Ce).call(this) || w(C, this, On).call(this, e);
    })) : w(C, this, On).call(this, e);
  }
};
function gs() {
  try {
    y(ne, this, je(() => l(at, this).call(this, l(te, this))));
  } catch (e) {
    this.error(e);
  }
}
function ws(e) {
  const t = l(se, this).failed, { reset: n, invoke_onerror: r } = w(C, this, Or).call(this, e);
  Oe(r), t && y(J, this, je(() => {
    t(l(te, this), () => e, () => n);
  }));
}
function Or(e) {
  var t = !1, n = !1;
  const r = () => {
    if (!w(C, this, Ce).call(this)) {
      if (t) {
        ii();
        return;
      }
      t = !0, n && yi(), l(J, this) !== null && Wt(l(J, this), () => {
        y(J, this, null);
      }), w(C, this, hn).call(this, () => {
        w(C, this, Ar).call(this);
      });
    }
  };
  return {
    reset: r,
    invoke_onerror: () => {
      if (!w(C, this, Ce).call(this))
        try {
          var s, a;
          n = !0, (s = (a = l(se, this)).onerror) === null || s === void 0 || s.call(a, e, r), n = !1;
        } catch (o) {
          ae(o, l(z, this) && l(z, this).parent);
        }
    }
  };
}
function Ce() {
  return (l(z, this).f & (Nn | Kt)) !== 0;
}
function ms() {
  const e = l(se, this).pending;
  e && (this.is_pending = !0, y(F, this, je(() => e(l(te, this)))), Oe(() => {
    if (!w(C, this, Ce).call(this)) {
      var t = y(pe, this, document.createDocumentFragment()), n = Nt(), r = !1;
      if (t.append(n), y(ne, this, w(C, this, hn).call(this, () => {
        try {
          return je(() => l(at, this).call(this, n));
        } catch (i) {
          try {
            this.error(i), r = !0;
          } catch (s) {
            ae(s, l(z, this).parent);
          }
          return null;
        }
      })), l(ne, this) === null) {
        y(pe, this, null), r && w(C, this, Pt).call(this, m);
        return;
      }
      l(Te, this) === 0 && (l(te, this).before(t), y(pe, this, null), Wt(l(F, this), () => {
        y(F, this, null);
      }), w(C, this, Pt).call(this, m));
    }
  }));
}
function Ar() {
  try {
    if (this.is_pending = this.has_pending_snippet(), y(Te, this, 0), y(Ne, this, 0), y(ne, this, je(() => {
      l(at, this).call(this, l(te, this));
    })), l(Te, this) > 0) {
      var e = y(pe, this, document.createDocumentFragment());
      rs(l(ne, this), e);
      const t = l(se, this).pending;
      y(F, this, je(() => t(l(te, this))));
    } else w(C, this, Pt).call(this, m);
  } catch (t) {
    this.error(t);
  }
}
function Pt(e) {
  this.is_pending = !1, e.transfer_reactions(l(rn, this));
}
function hn(e) {
  var t = b, n = k, r = A;
  G(l(z, this)), Y(l(z, this)), Fe(l(z, this).ctx);
  try {
    return Ye.ensure(), e();
  } finally {
    G(t), Y(n), Fe(r);
  }
}
function jr(e, t) {
  if (!this.has_pending_snippet()) {
    if (this.parent) {
      var n;
      w(C, n = this.parent, jr).call(n, e, t);
    }
    return;
  }
  y(Te, this, l(Te, this) + e), l(Te, this) === 0 && (w(C, this, Pt).call(this, t), l(F, this) && Wt(l(F, this), () => {
    y(F, this, null);
  }), l(pe, this) && (l(te, this).before(l(pe, this)), y(pe, this, null)));
}
function On(e) {
  l(ne, this) && (Q(l(ne, this)), y(ne, this, null)), l(F, this) && (Q(l(F, this)), y(F, this, null)), l(J, this) && (Q(l(J, this)), y(J, this, null)), B && (ge(l(nn, this)), si(), ge(oi()));
  let t = l(se, this).failed;
  const n = (r) => {
    if (w(C, this, Ce).call(this)) return;
    const { reset: i, invoke_onerror: s } = w(C, this, Or).call(this, r);
    s(), t && !w(C, this, Ce).call(this) && y(J, this, w(C, this, hn).call(this, () => {
      try {
        return je(() => {
          var a = b;
          a.b = this, a.f |= 128, t(l(te, this), () => r, () => i);
        });
      } catch (a) {
        return ae(a, l(z, this).parent), null;
      }
    }));
  };
  Oe(() => {
    if (!w(C, this, Ce).call(this)) {
      var r;
      try {
        r = this.transform_error(e);
      } catch (i) {
        ae(i, l(z, this) && l(z, this).parent);
        return;
      }
      r !== null && typeof r == "object" && typeof r.then == "function" ? r.then(n, (i) => ae(i, l(z, this) && l(z, this).parent)) : n(r);
    }
  });
}
var An = !0;
function Pr(e, t) {
  return Lr(e, t);
}
function ys(e, t) {
  var n;
  Qt(), t.intro = (n = t.intro) !== null && n !== void 0 ? n : !1;
  const r = t.target, i = B, s = O;
  try {
    for (var a = /* @__PURE__ */ $e(r); a && (a.nodeType !== 8 || a.data !== "["); ) a = /* @__PURE__ */ we(a);
    if (!a) throw _e;
    vt(!0), ge(a);
    const o = Lr(e, He(He({}, t), {}, { anchor: a }));
    return vt(!1), o;
  } catch (o) {
    if (o instanceof Error && o.message.split(`
`).some((u) => u.startsWith("https://svelte.dev/e/"))) throw o;
    return o !== _e && console.warn("Failed to hydrate: ", o), t.recover === !1 && pi(), Qt(), Fi(r), vt(!1), Pr(e, t);
  } finally {
    vt(i), ge(s);
  }
}
var wt = /* @__PURE__ */ new Map();
function Lr(e, { target: t, anchor: n, props: r = {}, events: i, context: s, intro: a = !0, transformError: o }) {
  Qt();
  var u = void 0, h = Xi(() => {
    var v = n != null ? n : t.appendChild(Nt());
    ps(v, { pending: () => {
    } }, (d) => {
      qn({});
      var g = A;
      if (s && (g.c = s), i && (r.$$events = i), B && De(d, null), An = a, u = e(d, r) || Yn(), An = !0, B && (b.nodes.end = O, O === null || O.nodeType !== 8 || O.data !== "]"))
        throw It(), _e;
      Vn();
    }, o);
    var f = /* @__PURE__ */ new Set(), c = (d) => {
      for (var g = 0; g < d.length; g++) {
        var p = d[g];
        if (!f.has(p)) {
          f.add(p);
          var $ = cs(p);
          for (const R of [t, document]) {
            var _ = wt.get(R);
            _ === void 0 && (_ = /* @__PURE__ */ new Map(), wt.set(R, _));
            var E = _.get(p);
            E === void 0 ? (R.addEventListener(p, Tn, { passive: $ }), _.set(p, 1)) : _.set(p, E + 1);
          }
        }
      }
    };
    return c(Fr(as)), Mn.add(c), () => {
      for (var d of f) for (const _ of [t, document]) {
        var g = wt.get(_), p = g.get(d);
        --p == 0 ? (_.removeEventListener(d, Tn), g.delete(d), g.size === 0 && wt.delete(_)) : g.set(d, p);
      }
      if (Mn.delete(c), v !== n) {
        var $;
        ($ = v.parentNode) === null || $ === void 0 || $.removeChild(v);
      }
    };
  });
  return sn.set(u, h), u;
}
var sn = /* @__PURE__ */ new WeakMap();
function bs(e, t) {
  const n = sn.get(e);
  return n ? (sn.delete(e), n(t)) : Promise.resolve();
}
function ks(e) {
  A === null && ui("onMount"), qe && A.l !== null ? $s(A).m.push(e) : en(() => {
    const t = ct(e);
    if (typeof t == "function") return t;
  });
}
function $s(e) {
  var t, n = e.l;
  return (t = n.u) !== null && t !== void 0 ? t : n.u = {
    a: [],
    b: [],
    m: []
  };
}
function xs(e, t, n = !1, r = !1, i = !1, s = !1) {
  var a = e, o = "";
  if (n) {
    var u = e;
    B && (a = ge(/* @__PURE__ */ $e(u)));
  }
  es(() => {
    var h, v = b;
    if (o === (o = (h = t()) !== null && h !== void 0 ? h : "")) {
      B && xt();
      return;
    }
    if (n && !B) {
      v.nodes = null, u.innerHTML = o, o !== "" && De(/* @__PURE__ */ $e(u), u.lastChild);
      return;
    }
    if (v.nodes !== null && (mr(v.nodes.start, v.nodes.end), v.nodes = null), o !== "") {
      if (B) {
        for (var f = O.data, c = xt(), d = c; c !== null && (c.nodeType !== 8 || c.data !== ""); )
          d = c, c = /* @__PURE__ */ we(c);
        if (c === null)
          throw It(), _e;
        De(O, d), a = ge(c);
        return;
      }
      var g = pr(r ? "svg" : i ? "math" : "template", r ? Wr : i ? zr : void 0);
      g.innerHTML = o;
      var p = r || i ? g : g.content;
      if (De(/* @__PURE__ */ $e(p), p.lastChild), r || i) for (; /* @__PURE__ */ $e(p); ) a.before(/* @__PURE__ */ $e(p));
      else a.before(p);
    }
  });
}
var Ir, Be = /* @__PURE__ */ new WeakMap(), Lt = /* @__PURE__ */ new WeakMap(), Yt = /* @__PURE__ */ new WeakMap(), jn = /* @__PURE__ */ new WeakSet(), Rr = class {
  constructor(e) {
    ln(this, jn), x(this, Be, /* @__PURE__ */ new WeakMap()), x(this, Lt, void 0), x(this, Yt, void 0), y(Yt, this, e);
  }
  observe(e, t) {
    var n = l(Be, this).get(e) || /* @__PURE__ */ new Set();
    return n.add(t), l(Be, this).set(e, n), w(jn, this, Ss).call(this).observe(e, l(Yt, this)), () => {
      var r = l(Be, this).get(e);
      r.delete(t), r.size === 0 && (l(Be, this).delete(e), l(Lt, this).unobserve(e));
    };
  }
};
Ir = Rr;
function Ss() {
  var e;
  return (e = l(Lt, this)) !== null && e !== void 0 ? e : y(Lt, this, new ResizeObserver((t) => {
    for (var n of t) {
      Ir.entries.set(n.target, n);
      for (var r of l(Be, this).get(n.target) || []) r(n);
    }
  }));
}
S(Rr, "entries", /* @__PURE__ */ new WeakMap());
function Es(e = !1) {
  const t = A, n = t.l.u;
  if (!n) return;
  let r = () => Tr(t.s);
  if (e) {
    let i = 0, s = {};
    const a = /* @__PURE__ */ it(() => {
      let o = !1;
      const u = t.s;
      for (const h in u) u[h] !== s[h] && (s[h] = u[h], o = !0);
      return o && i++, i;
    });
    r = () => N(a);
  }
  n.b.length && Gi(() => {
    Pn(t, r), Gt(n.b);
  }), en(() => {
    const i = ct(() => n.m.map(Gr));
    return () => {
      for (const s of i) typeof s == "function" && s();
    };
  }), n.a.length && en(() => {
    Pn(t, r), Gt(n.a);
  });
}
function Pn(e, t) {
  if (e.l.s) for (const n of e.l.s) N(n);
  t();
}
var mt = !1;
function Ms(e) {
  var t = mt;
  try {
    return mt = !1, [e(), mt];
  } finally {
    mt = t;
  }
}
function Ts(e, t, n, r) {
  var i = !qe || (n & 2) !== 0, s = (n & 8) !== 0, a = (n & 16) !== 0, o = r, u = !0, h = void 0, v = () => {
    if (a && i) {
      var M;
      return (M = h) !== null && M !== void 0 || (h = /* @__PURE__ */ it(r)), N(h);
    }
    return u && (u = !1, o = a ? ct(r) : r), o;
  };
  let f;
  if (s) {
    var c, d, g = ze in e || Hn in e;
    f = (c = (d = Ee(e, t)) === null || d === void 0 ? void 0 : d.set) !== null && c !== void 0 ? c : g && t in e ? (M) => e[t] = M : void 0;
  }
  var p, $ = !1;
  s ? [p, $] = Ms(() => e[t]) : p = e[t], p === void 0 && r !== void 0 && (p = v(), f && (i && _i(t), f(p)));
  var _;
  if (i ? _ = () => {
    var M = e[t];
    return M === void 0 ? v() : (u = !0, M);
  } : _ = () => {
    var M = e[t];
    return M !== void 0 && (o = void 0), M === void 0 ? o : M;
  }, i && (n & 4) === 0) return _;
  if (f) {
    var E = e.$$legacy;
    return (function(M, L) {
      return arguments.length > 0 ? ((!i || !L || E || $) && f(L ? _() : M), M) : _();
    });
  }
  var R = !1, D = ((n & 1) !== 0 ? it : Zn)(() => (R = !1, _()));
  s && N(D);
  var K = b;
  return (function(M, L) {
    if (arguments.length > 0) {
      const dt = L ? N(D) : i && s ? We(M) : M;
      return ie(D, dt), R = !0, o !== void 0 && (o = dt), M;
    }
    return ue && R || (K.f & 16384) !== 0 ? D.v : N(D);
  });
}
function Cs(e) {
  return new Os(e);
}
var ye = /* @__PURE__ */ new WeakMap(), re = /* @__PURE__ */ new WeakMap(), Os = class {
  constructor(e) {
    var t, n;
    x(this, ye, void 0), x(this, re, void 0);
    var r = /* @__PURE__ */ new Map(), i = (a, o) => {
      var u = /* @__PURE__ */ cr(o, !1, !1);
      return r.set(a, u), u;
    };
    const s = new Proxy(He(He({}, e.props || {}), {}, { $$events: {} }), {
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
    y(re, this, (e.hydrate ? ys : Pr)(e.component, {
      target: e.target,
      anchor: e.anchor,
      props: s,
      context: e.context,
      intro: (t = e.intro) !== null && t !== void 0 ? t : !1,
      recover: e.recover,
      transformError: e.transformError
    })), !Ue && (!(!(e == null || (n = e.props) === null || n === void 0) && n.$$host) || e.sync === !1) && un(), y(ye, this, s.$$events);
    for (const a of Object.keys(l(re, this)))
      a === "$set" || a === "$destroy" || a === "$on" || nt(this, a, {
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
      bs(l(re, this));
    };
  }
  $set(e) {
    l(re, this).$set(e);
  }
  $on(e, t) {
    l(ye, this)[e] = l(ye, this)[e] || [];
    const n = (...r) => t.call(this, ...r);
    return l(ye, this)[e].push(n), () => {
      l(ye, this)[e] = l(ye, this)[e].filter((r) => r !== n);
    };
  }
  $destroy() {
    l(re, this).$destroy();
  }
}, Nr;
typeof HTMLElement == "function" && (Nr = class extends HTMLElement {
  constructor(e, t, n) {
    super(), S(this, "$$ctor", void 0), S(this, "$$s", void 0), S(this, "$$c", void 0), S(this, "$$cn", !1), S(this, "$$d", {}), S(this, "$$r", !1), S(this, "$$p_d", {}), S(this, "$$l", {}), S(this, "$$l_u", /* @__PURE__ */ new Map()), S(this, "$$me", void 0), S(this, "$$shadowRoot", null), this.$$ctor = e, this.$$s = t, n && (this.$$shadowRoot = this.attachShadow(n));
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
          const s = pr("slot");
          r !== "default" && (s.name = r), Cr(i, s);
        };
      };
      if (await Promise.resolve(), !this.$$cn || this.$$c) return;
      const t = {}, n = As(this);
      for (const r of this.$$s) r in n && (r === "default" && !this.$$d.children ? (this.$$d.children = e(r), t.default = !0) : t[r] = e(r));
      for (const r of this.attributes) {
        const i = this.$$g_p(r.name);
        i in this.$$d || (this.$$d[i] = bt(i, r.value, this.$$p_d, "toProp"));
      }
      for (const r in this.$$p_d) !(r in this.$$d) && this[r] !== void 0 && (this.$$d[r] = this[r], delete this[r]);
      this.$$c = Cs({
        component: this.$$ctor,
        target: this.$$shadowRoot || this,
        props: He(He({}, this.$$d), {}, {
          $$slots: t,
          $$host: this
        })
      }), this.$$me = Ki(() => {
        Bt(() => {
          this.$$r = !0;
          for (const i of kt(this.$$c)) {
            var r;
            if (!(!((r = this.$$p_d[i]) === null || r === void 0) && r.reflect)) continue;
            this.$$d[i] = this.$$c[i];
            const s = bt(i, this.$$d[i], this.$$p_d, "toAttribute");
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
    this.$$r || (e = this.$$g_p(e), this.$$d[e] = bt(e, n, this.$$p_d, "toProp"), (r = this.$$c) === null || r === void 0 || r.$set({ [e]: this.$$d[e] }));
  }
  disconnectedCallback() {
    this.$$cn = !1, Promise.resolve().then(() => {
      !this.$$cn && this.$$c && (this.$$c.$destroy(), this.$$me(), this.$$c = void 0);
    });
  }
  $$g_p(e) {
    return kt(this.$$p_d).find((t) => this.$$p_d[t].attribute === e || !this.$$p_d[t].attribute && t.toLowerCase() === e) || e;
  }
});
function bt(e, t, n, r) {
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
function As(e) {
  const t = {};
  return e.childNodes.forEach((n) => {
    t[n.slot || "default"] = !0;
  }), t;
}
function js(e, t, n, r, i, s) {
  let a = class extends Nr {
    constructor() {
      super(e, n, i), this.$$p_d = t;
    }
    static get observedAttributes() {
      return kt(t).map((o) => (t[o].attribute || o).toLowerCase());
    }
  };
  return kt(t).forEach((o) => {
    nt(a.prototype, o, {
      get() {
        return this.$$c && o in this.$$c ? this.$$c[o] : this.$$d[o];
      },
      set(u) {
        u = bt(o, u, t), this.$$d[o] = u;
        var h = this.$$c;
        if (h) {
          var v;
          !((v = Ee(h, o)) === null || v === void 0) && v.get ? h[o] = u : h.$set({ [o]: u });
        }
      }
    });
  }), r.forEach((o) => {
    nt(a.prototype, o, { get() {
      var u;
      return (u = this.$$c) === null || u === void 0 ? void 0 : u[o];
    } });
  }), s && (a = s(a)), e.element = a, a;
}
var Ps = `

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

   

    <div id='comments-list'></div>

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
function Ls(e, t) {
  qn(t, !1);
  let n = Ts(t, "pageId", 12, "home");
  const r = "/widgets/comment-runtime.js?v=reply-border-motion-1", i = {
    dm: "/widgets/comment-dm.css",
    report: "/widgets/comment-report.css",
    settings: "/widgets/comment-settings.css",
    effects: "/widgets/comment-effects.css?v=avatar-frame-fit-2"
  }, s = [
    ["https://cdn.jsdelivr.net/npm/dompurify@3.2.7/dist/purify.min.js", () => !!window.DOMPurify],
    ["https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js", () => !!window.firebase],
    ["https://www.gstatic.com/firebasejs/10.14.0/firebase-auth-compat.js", () => {
      var _;
      return !!(!((_ = window.firebase) === null || _ === void 0) && _.auth);
    }],
    ["https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore-compat.js", () => {
      var _;
      return !!(!((_ = window.firebase) === null || _ === void 0) && _.firestore);
    }],
    ["https://cdn.jsdelivr.net/npm/md5@2.3.0/dist/md5.min.js", () => !!window.md5]
  ];
  let a = /* @__PURE__ */ cr(!1);
  const o = /* @__PURE__ */ new Map();
  let u = null;
  function h() {
    return u || (u = fetch(r).then((_) => {
      if (!_.ok) throw new Error(`Failed to load ${r}: ${_.status}`);
      return _.text();
    }), u);
  }
  function v(_) {
    if (document.head.querySelector(`link[href="${_}"]`)) return;
    const E = document.createElement("link");
    E.rel = "stylesheet", E.href = _, E.dataset.mikorokuCommentStyle = "", document.head.appendChild(E);
  }
  function f(_) {
    v(i[_]);
  }
  function c(_, E) {
    if (E()) return Promise.resolve();
    const R = o.get(_);
    if (R) return R;
    const D = new Promise((K, M) => {
      const L = document.createElement("script");
      L.src = _, L.async = !1, L.addEventListener("load", () => K(), { once: !0 }), L.addEventListener("error", () => M(/* @__PURE__ */ new Error(`Failed to load ${_}`)), { once: !0 }), document.head.appendChild(L);
    });
    return o.set(_, D), D;
  }
  async function d() {
    var _, E;
    const R = h(), [D, K, M] = s;
    if (await Promise.all([c(D[0], D[1]), c(M[0], M[1])]), await c(K[0], K[1]), await Promise.all(s.slice(2, 4).map(([L, dt]) => c(L, dt))), !N(a)) {
      const L = document.createElement("script");
      L.textContent = await R, document.body.appendChild(L), ie(a, !0);
    }
    (_ = (E = window).setCommentCommunityPageId) === null || _ === void 0 || _.call(E, n() || "home");
  }
  ks(() => {
    v("/widgets/comment-widget.css?v=reply-border-motion-1"), window.loadCommentFeatureStyles = f;
    const _ = "requestIdleCallback" in window ? window.requestIdleCallback(() => f("effects"), { timeout: 2500 }) : window.setTimeout(() => f("effects"), 2500);
    return d().catch((E) => {
      console.error("Comment widget failed to initialize.", E);
    }), () => {
      typeof _ == "number" && window.clearTimeout(_), window.loadCommentFeatureStyles === f && delete window.loadCommentFeatureStyles;
    };
  }), Zi(() => (N(a), Tr(n())), () => {
    if (N(a) && n()) {
      var _, E;
      (_ = (E = window).setCommentCommunityPageId) === null || _ === void 0 || _.call(E, n());
    }
  }), Ji();
  var g = {
    get pageId() {
      return n();
    },
    set pageId(_) {
      n(_), un();
    }
  };
  Es();
  var p = ls(), $ = Hi(p);
  return xs($, () => Ps), Cr(e, p), Vn(g);
}
customElements.define("mikoroku-comment-widget", js(Ls, { pageId: {
  attribute: "page-id",
  type: "String"
} }, [], []));
export {
  Ls as default
};
