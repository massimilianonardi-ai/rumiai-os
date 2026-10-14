//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function Table()
{
  return Table.Class.construct(this, arguments);
}

Class(Table)
.inherit(ElementConfInputStore)
.property("conf", {columns: ['Name', 'Position', 'Salary'], data: [['Manas', 'Software Engineer', '$1400']]})
//.property("data")
//.setter("data", function(value, indexValue, indexText)
//{
//  var conf = this.conf();
//  conf.data = value;
//  this.conf(conf);
//})
.properties()
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

Table.prototype.construct = function()
{
  this.rebuild();
};

//------------------------------------------------------------------------------

Table.prototype.update = function()
{
  this.rebuild();
};

//------------------------------------------------------------------------------

Table.prototype.rebuild = function()
{
  this.html("");
  
  this._label = document.createElement("label");
  this._label.style.display = "none";
  this.node.appendChild(this._label);
  this.label(this.label());
  
  this.table = document.createElement("div");
  this.node.appendChild(this.table);
  this.datatable = new DataTable(this.table, this.conf());
};

//------------------------------------------------------------------------------

function mFrappeDataTable()
{
var Element = window.Element;

/*
 Clusterize.js - v0.18.0 - 2017-11-04
 http://NeXTs.github.com/Clusterize.js/
 Copyright (c) 2015 Denis Lukov; Licensed GPLv3 */

;(function(q,n){"undefined"!=typeof module?module.exports=n():"function"==typeof define&&"object"==typeof define.amd?define(n):this[q]=n()})("Clusterize",function(){function q(b,a,c){return a.addEventListener?a.addEventListener(b,c,!1):a.attachEvent("on"+b,c)}function n(b,a,c){return a.removeEventListener?a.removeEventListener(b,c,!1):a.detachEvent("on"+b,c)}function r(b){return"[object Array]"===Object.prototype.toString.call(b)}function m(b,a){return window.getComputedStyle?window.getComputedStyle(a)[b]:
a.currentStyle[b]}var l=function(){for(var b=3,a=document.createElement("b"),c=a.all||[];a.innerHTML="\x3c!--[if gt IE "+ ++b+"]><i><![endif]--\x3e",c[0];);return 4<b?b:document.documentMode}(),x=navigator.platform.toLowerCase().indexOf("mac")+1,p=function(b){if(!(this instanceof p))return new p(b);var a=this,c={rows_in_block:50,blocks_in_cluster:4,tag:null,show_no_data_row:!0,no_data_class:"clusterize-no-data",no_data_text:"No data",keep_parity:!0,callbacks:{}};a.options={};for(var d="rows_in_block blocks_in_cluster show_no_data_row no_data_class no_data_text keep_parity tag callbacks".split(" "),
f=0,h;h=d[f];f++)a.options[h]="undefined"!=typeof b[h]&&null!=b[h]?b[h]:c[h];c=["scroll","content"];for(f=0;d=c[f];f++)if(a[d+"_elem"]=b[d+"Id"]?document.getElementById(b[d+"Id"]):b[d+"Elem"],!a[d+"_elem"])throw Error("Error! Could not find "+d+" element");a.content_elem.hasAttribute("tabindex")||a.content_elem.setAttribute("tabindex",0);var e=r(b.rows)?b.rows:a.fetchMarkup(),g={};b=a.scroll_elem.scrollTop;a.insertToDOM(e,g);a.scroll_elem.scrollTop=b;var k=!1,m=0,l=!1,t=function(){x&&(l||(a.content_elem.style.pointerEvents=
"none"),l=!0,clearTimeout(m),m=setTimeout(function(){a.content_elem.style.pointerEvents="auto";l=!1},50));k!=(k=a.getClusterNum())&&a.insertToDOM(e,g);a.options.callbacks.scrollingProgress&&a.options.callbacks.scrollingProgress(a.getScrollProgress())},u=0,v=function(){clearTimeout(u);u=setTimeout(a.refresh,100)};q("scroll",a.scroll_elem,t);q("resize",window,v);a.destroy=function(b){n("scroll",a.scroll_elem,t);n("resize",window,v);a.html((b?a.generateEmptyRow():e).join(""))};a.refresh=function(b){(a.getRowsHeight(e)||
b)&&a.update(e)};a.update=function(b){e=r(b)?b:[];b=a.scroll_elem.scrollTop;e.length*a.options.item_height<b&&(k=a.scroll_elem.scrollTop=0);a.insertToDOM(e,g);a.scroll_elem.scrollTop=b};a.clear=function(){a.update([])};a.getRowsAmount=function(){return e.length};a.getScrollProgress=function(){return this.options.scroll_top/(e.length*this.options.item_height)*100||0};var w=function(b,c){var d=r(c)?c:[];d.length&&(e="append"==b?e.concat(d):d.concat(e),a.insertToDOM(e,g))};a.append=function(a){w("append",
a)};a.prepend=function(a){w("prepend",a)}};p.prototype={constructor:p,fetchMarkup:function(){for(var b=[],a=this.getChildNodes(this.content_elem);a.length;)b.push(a.shift().outerHTML);return b},exploreEnvironment:function(b,a){var c=this.options;c.content_tag=this.content_elem.tagName.toLowerCase();b.length&&(l&&9>=l&&!c.tag&&(c.tag=b[0].match(/<([^>\s/]*)/)[1].toLowerCase()),1>=this.content_elem.children.length&&(a.data=this.html(b[0]+b[0]+b[0])),c.tag||(c.tag=this.content_elem.children[0].tagName.toLowerCase()),
this.getRowsHeight(b))},getRowsHeight:function(b){var a=this.options,c=a.item_height;a.cluster_height=0;if(b.length){b=this.content_elem.children;var d=b[Math.floor(b.length/2)];a.item_height=d.offsetHeight;"tr"==a.tag&&"collapse"!=m("borderCollapse",this.content_elem)&&(a.item_height+=parseInt(m("borderSpacing",this.content_elem),10)||0);"tr"!=a.tag&&(b=parseInt(m("marginTop",d),10)||0,d=parseInt(m("marginBottom",d),10)||0,a.item_height+=Math.max(b,d));a.block_height=a.item_height*a.rows_in_block;
a.rows_in_cluster=a.blocks_in_cluster*a.rows_in_block;a.cluster_height=a.blocks_in_cluster*a.block_height;return c!=a.item_height}},getClusterNum:function(){this.options.scroll_top=this.scroll_elem.scrollTop;return Math.floor(this.options.scroll_top/(this.options.cluster_height-this.options.block_height))||0},generateEmptyRow:function(){var b=this.options;if(!b.tag||!b.show_no_data_row)return[];var a=document.createElement(b.tag),c=document.createTextNode(b.no_data_text);a.className=b.no_data_class;
if("tr"==b.tag){var d=document.createElement("td");d.colSpan=100;d.appendChild(c)}a.appendChild(d||c);return[a.outerHTML]},generate:function(b,a){var c=this.options,d=b.length;if(d<c.rows_in_block)return{top_offset:0,bottom_offset:0,rows_above:0,rows:d?b:this.generateEmptyRow()};var f=Math.max((c.rows_in_cluster-c.rows_in_block)*a,0),h=f+c.rows_in_cluster,e=Math.max(f*c.item_height,0);c=Math.max((d-h)*c.item_height,0);d=[];var g=f;for(1>e&&g++;f<h;f++)b[f]&&d.push(b[f]);return{top_offset:e,bottom_offset:c,
rows_above:g,rows:d}},renderExtraTag:function(b,a){var c=document.createElement(this.options.tag);c.className=["clusterize-extra-row","clusterize-"+b].join(" ");a&&(c.style.height=a+"px");return c.outerHTML},insertToDOM:function(b,a){this.options.cluster_height||this.exploreEnvironment(b,a);var c=this.generate(b,this.getClusterNum()),d=c.rows.join(""),f=this.checkChanges("data",d,a),h=this.checkChanges("top",c.top_offset,a),e=this.checkChanges("bottom",c.bottom_offset,a),g=this.options.callbacks,
k=[];f||h?(c.top_offset&&(this.options.keep_parity&&k.push(this.renderExtraTag("keep-parity")),k.push(this.renderExtraTag("top-space",c.top_offset))),k.push(d),c.bottom_offset&&k.push(this.renderExtraTag("bottom-space",c.bottom_offset)),g.clusterWillChange&&g.clusterWillChange(),this.html(k.join("")),"ol"==this.options.content_tag&&this.content_elem.setAttribute("start",c.rows_above),this.content_elem.style["counter-increment"]="clusterize-counter "+(c.rows_above-1),g.clusterChanged&&g.clusterChanged()):
e&&(this.content_elem.lastChild.style.height=c.bottom_offset+"px")},html:function(b){var a=this.content_elem;if(l&&9>=l&&"tr"==this.options.tag){var c=document.createElement("div");for(c.innerHTML="<table><tbody>"+b+"</tbody></table>";b=a.lastChild;)a.removeChild(b);for(c=this.getChildNodes(c.firstChild.firstChild);c.length;)a.appendChild(c.shift())}else a.innerHTML=b},getChildNodes:function(b){b=b.children;for(var a=[],c=0,d=b.length;c<d;c++)a.push(b[c]);return a},checkChanges:function(b,a,c){var d=
a!=c[b];c[b]=a;return d}};return p});

/**!
 * Sortable 1.10.0-rc3
 * @author	RubaXa   <trash@rubaxa.org>
 * @author	owenm    <owen23355@gmail.com>
 * @license MIT
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.Sortable = factory());
}(this, function () { 'use strict';

  function _typeof(obj) {
    if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
      _typeof = function (obj) {
        return typeof obj;
      };
    } else {
      _typeof = function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
    }

    return _typeof(obj);
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _extends() {
    _extends = Object.assign || function (target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];

        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }

      return target;
    };

    return _extends.apply(this, arguments);
  }

  function _objectSpread(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] != null ? arguments[i] : {};
      var ownKeys = Object.keys(source);

      if (typeof Object.getOwnPropertySymbols === 'function') {
        ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) {
          return Object.getOwnPropertyDescriptor(source, sym).enumerable;
        }));
      }

      ownKeys.forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    }

    return target;
  }

  function _objectWithoutPropertiesLoose(source, excluded) {
    if (source == null) return {};
    var target = {};
    var sourceKeys = Object.keys(source);
    var key, i;

    for (i = 0; i < sourceKeys.length; i++) {
      key = sourceKeys[i];
      if (excluded.indexOf(key) >= 0) continue;
      target[key] = source[key];
    }

    return target;
  }

  function _objectWithoutProperties(source, excluded) {
    if (source == null) return {};

    var target = _objectWithoutPropertiesLoose(source, excluded);

    var key, i;

    if (Object.getOwnPropertySymbols) {
      var sourceSymbolKeys = Object.getOwnPropertySymbols(source);

      for (i = 0; i < sourceSymbolKeys.length; i++) {
        key = sourceSymbolKeys[i];
        if (excluded.indexOf(key) >= 0) continue;
        if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
        target[key] = source[key];
      }
    }

    return target;
  }

  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread();
  }

  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

      return arr2;
    }
  }

  function _iterableToArray(iter) {
    if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
  }

  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance");
  }

  var version = "1.10.0-rc3";

  function userAgent(pattern) {
    return !!
    /*@__PURE__*/
    navigator.userAgent.match(pattern);
  }

  var IE11OrLess = userAgent(/(?:Trident.*rv[ :]?11\.|msie|iemobile|Windows Phone)/i);
  var Edge = userAgent(/Edge/i);
  var FireFox = userAgent(/firefox/i);
  var Safari = userAgent(/safari/i) && !userAgent(/chrome/i) && !userAgent(/android/i);
  var IOS = userAgent(/iP(ad|od|hone)/i);
  var ChromeForAndroid = userAgent(/chrome/i) && userAgent(/android/i);

  var captureMode = {
    capture: false,
    passive: false
  };

  function on(el, event, fn) {
    el.addEventListener(event, fn, !IE11OrLess && captureMode);
  }

  function off(el, event, fn) {
    el.removeEventListener(event, fn, !IE11OrLess && captureMode);
  }

  function matches(
  /**HTMLElement*/
  el,
  /**String*/
  selector) {
    if (!selector) return;
    selector[0] === '>' && (selector = selector.substring(1));

    if (el) {
      try {
        if (el.matches) {
          return el.matches(selector);
        } else if (el.msMatchesSelector) {
          return el.msMatchesSelector(selector);
        } else if (el.webkitMatchesSelector) {
          return el.webkitMatchesSelector(selector);
        }
      } catch (_) {
        return false;
      }
    }

    return false;
  }

  function getParentOrHost(el) {
    return el.host && el !== document && el.host.nodeType ? el.host : el.parentNode;
  }

  function closest(
  /**HTMLElement*/
  el,
  /**String*/
  selector,
  /**HTMLElement*/
  ctx, includeCTX) {
    if (el) {
      ctx = ctx || document;

      do {
        if (selector != null && (selector[0] === '>' ? el.parentNode === ctx && matches(el, selector) : matches(el, selector)) || includeCTX && el === ctx) {
          return el;
        }

        if (el === ctx) break;
        /* jshint boss:true */
      } while (el = getParentOrHost(el));
    }

    return null;
  }

  var R_SPACE = /\s+/g;

  function toggleClass(el, name, state) {
    if (el && name) {
      if (el.classList) {
        el.classList[state ? 'add' : 'remove'](name);
      } else {
        var className = (' ' + el.className + ' ').replace(R_SPACE, ' ').replace(' ' + name + ' ', ' ');
        el.className = (className + (state ? ' ' + name : '')).replace(R_SPACE, ' ');
      }
    }
  }

  function css(el, prop, val) {
    var style = el && el.style;

    if (style) {
      if (val === void 0) {
        if (document.defaultView && document.defaultView.getComputedStyle) {
          val = document.defaultView.getComputedStyle(el, '');
        } else if (el.currentStyle) {
          val = el.currentStyle;
        }

        return prop === void 0 ? val : val[prop];
      } else {
        if (!(prop in style) && prop.indexOf('webkit') === -1) {
          prop = '-webkit-' + prop;
        }

        style[prop] = val + (typeof val === 'string' ? '' : 'px');
      }
    }
  }

  function matrix(el, selfOnly) {
    var appliedTransforms = '';

    do {
      var transform = css(el, 'transform');

      if (transform && transform !== 'none') {
        appliedTransforms = transform + ' ' + appliedTransforms;
      }
      /* jshint boss:true */

    } while (!selfOnly && (el = el.parentNode));

    var matrixFn = window.DOMMatrix || window.WebKitCSSMatrix || window.CSSMatrix;
    /*jshint -W056 */

    return matrixFn && new matrixFn(appliedTransforms);
  }

  function find(ctx, tagName, iterator) {
    if (ctx) {
      var list = ctx.getElementsByTagName(tagName),
          i = 0,
          n = list.length;

      if (iterator) {
        for (; i < n; i++) {
          iterator(list[i], i);
        }
      }

      return list;
    }

    return [];
  }

  function getWindowScrollingElement() {
    if (IE11OrLess) {
      return document.documentElement;
    } else {
      return document.scrollingElement;
    }
  }
  /**
   * Returns the "bounding client rect" of given element
   * @param  {HTMLElement} el                       The element whose boundingClientRect is wanted
   * @param  {[Boolean]} relativeToContainingBlock  Whether the rect should be relative to the containing block of (including) the container
   * @param  {[Boolean]} relativeToNonStaticParent  Whether the rect should be relative to the relative parent of (including) the contaienr
   * @param  {[Boolean]} undoScale                  Whether the container's scale() should be undone
   * @param  {[HTMLElement]} container              The parent the element will be placed in
   * @return {Object}                               The boundingClientRect of el, with specified adjustments
   */


  function getRect(el, relativeToContainingBlock, relativeToNonStaticParent, undoScale, container) {
    if (!el.getBoundingClientRect && el !== window) return;
    var elRect, top, left, bottom, right, height, width;

    if (el !== window && el !== getWindowScrollingElement()) {
      elRect = el.getBoundingClientRect();
      top = elRect.top;
      left = elRect.left;
      bottom = elRect.bottom;
      right = elRect.right;
      height = elRect.height;
      width = elRect.width;
    } else {
      top = 0;
      left = 0;
      bottom = window.innerHeight;
      right = window.innerWidth;
      height = window.innerHeight;
      width = window.innerWidth;
    }

    if ((relativeToContainingBlock || relativeToNonStaticParent) && el !== window) {
      // Adjust for translate()
      container = container || el.parentNode; // solves #1123 (see: https://stackoverflow.com/a/37953806/6088312)
      // Not needed on <= IE11

      if (!IE11OrLess) {
        do {
          if (container && container.getBoundingClientRect && (css(container, 'transform') !== 'none' || relativeToNonStaticParent && css(container, 'position') !== 'static')) {
            var containerRect = container.getBoundingClientRect(); // Set relative to edges of padding box of container

            top -= containerRect.top + parseInt(css(container, 'border-top-width'));
            left -= containerRect.left + parseInt(css(container, 'border-left-width'));
            bottom = top + elRect.height;
            right = left + elRect.width;
            break;
          }
          /* jshint boss:true */

        } while (container = container.parentNode);
      }
    }

    if (undoScale && el !== window) {
      // Adjust for scale()
      var elMatrix = matrix(container || el),
          scaleX = elMatrix && elMatrix.a,
          scaleY = elMatrix && elMatrix.d;

      if (elMatrix) {
        top /= scaleY;
        left /= scaleX;
        width /= scaleX;
        height /= scaleY;
        bottom = top + height;
        right = left + width;
      }
    }

    return {
      top: top,
      left: left,
      bottom: bottom,
      right: right,
      width: width,
      height: height
    };
  }
  /**
   * Checks if a side of an element is scrolled past a side of its parents
   * @param  {HTMLElement}  el           The element who's side being scrolled out of view is in question
   * @param  {[DOMRect]}    rect         Optional rect of `el` to use
   * @param  {String}       elSide       Side of the element in question ('top', 'left', 'right', 'bottom')
   * @param  {String}       parentSide   Side of the parent in question ('top', 'left', 'right', 'bottom')
   * @return {HTMLElement}               The parent scroll element that the el's side is scrolled past, or null if there is no such element
   */


  function isScrolledPast(el, rect, elSide, parentSide) {
    var parent = getParentAutoScrollElement(el, true),
        elSideVal = (rect ? rect : getRect(el))[elSide];
    /* jshint boss:true */

    while (parent) {
      var parentSideVal = getRect(parent)[parentSide],
          visible = void 0;

      if (parentSide === 'top' || parentSide === 'left') {
        visible = elSideVal >= parentSideVal;
      } else {
        visible = elSideVal <= parentSideVal;
      }

      if (!visible) return parent;
      if (parent === getWindowScrollingElement()) break;
      parent = getParentAutoScrollElement(parent, false);
    }

    return false;
  }
  /**
   * Gets nth child of el, ignoring hidden children, sortable's elements (does not ignore clone if it's visible)
   * and non-draggable elements
   * @param  {HTMLElement} el       The parent element
   * @param  {Number} childNum      The index of the child
   * @param  {Object} options       Parent Sortable's options
   * @return {HTMLElement}          The child at index childNum, or null if not found
   */


  function getChild(el, childNum, options) {
    var currentChild = 0,
        i = 0,
        children = el.children;

    while (i < children.length) {
      if (children[i].style.display !== 'none' && children[i] !== Sortable.ghost && children[i] !== Sortable.dragged && closest(children[i], options.draggable, el, false)) {
        if (currentChild === childNum) {
          return children[i];
        }

        currentChild++;
      }

      i++;
    }

    return null;
  }
  /**
   * Gets the last child in the el, ignoring ghostEl or invisible elements (clones)
   * @param  {HTMLElement} el       Parent element
   * @param  {selector} selector    Any other elements that should be ignored
   * @return {HTMLElement}          The last child, ignoring ghostEl
   */


  function lastChild(el, selector) {
    var last = el.lastElementChild;

    while (last && (last === Sortable.ghost || css(last, 'display') === 'none' || selector && !matches(last, selector))) {
      last = last.previousElementSibling;
    }

    return last || null;
  }
  /**
   * Returns the index of an element within its parent for a selected set of
   * elements
   * @param  {HTMLElement} el
   * @param  {selector} selector
   * @return {number}
   */


  function index(el, selector) {
    var index = 0;

    if (!el || !el.parentNode) {
      return -1;
    }
    /* jshint boss:true */


    while (el = el.previousElementSibling) {
      if (el.nodeName.toUpperCase() !== 'TEMPLATE' && el !== Sortable.clone && (!selector || matches(el, selector))) {
        index++;
      }
    }

    return index;
  }
  /**
   * Returns the scroll offset of the given element, added with all the scroll offsets of parent elements.
   * The value is returned in real pixels.
   * @param  {HTMLElement} el
   * @return {Array}             Offsets in the format of [left, top]
   */


  function getRelativeScrollOffset(el) {
    var offsetLeft = 0,
        offsetTop = 0,
        winScroller = getWindowScrollingElement();

    if (el) {
      do {
        var elMatrix = matrix(el),
            scaleX = elMatrix.a,
            scaleY = elMatrix.d;
        offsetLeft += el.scrollLeft * scaleX;
        offsetTop += el.scrollTop * scaleY;
      } while (el !== winScroller && (el = el.parentNode));
    }

    return [offsetLeft, offsetTop];
  }
  /**
   * Returns the index of the object within the given array
   * @param  {Array} arr   Array that may or may not hold the object
   * @param  {Object} obj  An object that has a key-value pair unique to and identical to a key-value pair in the object you want to find
   * @return {Number}      The index of the object in the array, or -1
   */


  function indexOfObject(arr, obj) {
    for (var i in arr) {
      if (!arr.hasOwnProperty(i)) continue;

      for (var key in obj) {
        if (obj.hasOwnProperty(key) && obj[key] === arr[i][key]) return Number(i);
      }
    }

    return -1;
  }

  function getParentAutoScrollElement(el, includeSelf) {
    // skip to window
    if (!el || !el.getBoundingClientRect) return getWindowScrollingElement();
    var elem = el;
    var gotSelf = false;

    do {
      // we don't need to get elem css if it isn't even overflowing in the first place (performance)
      if (elem.clientWidth < elem.scrollWidth || elem.clientHeight < elem.scrollHeight) {
        var elemCSS = css(elem);

        if (elem.clientWidth < elem.scrollWidth && (elemCSS.overflowX == 'auto' || elemCSS.overflowX == 'scroll') || elem.clientHeight < elem.scrollHeight && (elemCSS.overflowY == 'auto' || elemCSS.overflowY == 'scroll')) {
          if (!elem.getBoundingClientRect || elem === document.body) return getWindowScrollingElement();
          if (gotSelf || includeSelf) return elem;
          gotSelf = true;
        }
      }
      /* jshint boss:true */

    } while (elem = elem.parentNode);

    return getWindowScrollingElement();
  }

  function extend(dst, src) {
    if (dst && src) {
      for (var key in src) {
        if (src.hasOwnProperty(key)) {
          dst[key] = src[key];
        }
      }
    }

    return dst;
  }

  function isRectEqual(rect1, rect2) {
    return Math.round(rect1.top) === Math.round(rect2.top) && Math.round(rect1.left) === Math.round(rect2.left) && Math.round(rect1.height) === Math.round(rect2.height) && Math.round(rect1.width) === Math.round(rect2.width);
  }

  var _throttleTimeout;

  function throttle(callback, ms) {
    return function () {
      if (!_throttleTimeout) {
        var args = arguments,
            _this = this;

        if (args.length === 1) {
          callback.call(_this, args[0]);
        } else {
          callback.apply(_this, args);
        }

        _throttleTimeout = setTimeout(function () {
          _throttleTimeout = void 0;
        }, ms);
      }
    };
  }

  function cancelThrottle() {
    clearTimeout(_throttleTimeout);
    _throttleTimeout = void 0;
  }

  function scrollBy(el, x, y) {
    el.scrollLeft += x;
    el.scrollTop += y;
  }

  function clone(el) {
    var Polymer = window.Polymer;
    var $ = window.jQuery || window.Zepto;

    if (Polymer && Polymer.dom) {
      return Polymer.dom(el).cloneNode(true);
    } else if ($) {
      return $(el).clone(true)[0];
    } else {
      return el.cloneNode(true);
    }
  }

  function setRect(el, rect) {
    css(el, 'position', 'absolute');
    css(el, 'top', rect.top);
    css(el, 'left', rect.left);
    css(el, 'width', rect.width);
    css(el, 'height', rect.height);
  }

  function unsetRect(el) {
    css(el, 'position', '');
    css(el, 'top', '');
    css(el, 'left', '');
    css(el, 'width', '');
    css(el, 'height', '');
  }

  var expando = 'Sortable' + new Date().getTime();

  function AnimationStateManager() {
    var animationStates = [],
        animationCallbackId;
    return {
      captureAnimationState: function captureAnimationState() {
        animationStates = [];
        if (!this.options.animation) return;
        var children = [].slice.call(this.el.children);
        children.forEach(function (child) {
          if (css(child, 'display') === 'none' || child === Sortable.ghost) return;
          animationStates.push({
            target: child,
            rect: getRect(child)
          });
          var fromRect = getRect(child); // If animating: compensate for current animation

          if (child.thisAnimationDuration) {
            var childMatrix = matrix(child, true);

            if (childMatrix) {
              fromRect.top -= childMatrix.f;
              fromRect.left -= childMatrix.e;
            }
          }

          child.fromRect = fromRect;
        });
      },
      addAnimationState: function addAnimationState(state) {
        animationStates.push(state);
      },
      removeAnimationState: function removeAnimationState(target) {
        animationStates.splice(indexOfObject(animationStates, {
          target: target
        }), 1);
      },
      animateAll: function animateAll(callback) {
        var _this = this;

        if (!this.options.animation) {
          clearTimeout(animationCallbackId);
          if (typeof callback === 'function') callback();
          return;
        }

        var animating = false,
            animationTime = 0;
        animationStates.forEach(function (state) {
          var time = 0,
              target = state.target,
              fromRect = target.fromRect,
              toRect = getRect(target),
              prevFromRect = target.prevFromRect,
              prevToRect = target.prevToRect,
              animatingRect = state.rect,
              targetMatrix = matrix(target, true);

          if (targetMatrix) {
            // Compensate for current animation
            toRect.top -= targetMatrix.f;
            toRect.left -= targetMatrix.e;
          }

          target.toRect = toRect; // If element is scrolled out of view: Do not animate

          if ((isScrolledPast(target, toRect, 'bottom', 'top') || isScrolledPast(target, toRect, 'top', 'bottom') || isScrolledPast(target, toRect, 'right', 'left') || isScrolledPast(target, toRect, 'left', 'right')) && (isScrolledPast(target, animatingRect, 'bottom', 'top') || isScrolledPast(target, animatingRect, 'top', 'bottom') || isScrolledPast(target, animatingRect, 'right', 'left') || isScrolledPast(target, animatingRect, 'left', 'right')) && (isScrolledPast(target, fromRect, 'bottom', 'top') || isScrolledPast(target, fromRect, 'top', 'bottom') || isScrolledPast(target, fromRect, 'right', 'left') || isScrolledPast(target, fromRect, 'left', 'right'))) return;

          if (target.thisAnimationDuration) {
            // Could also check if animatingRect is between fromRect and toRect
            if (isRectEqual(prevFromRect, toRect) && !isRectEqual(fromRect, toRect) && // Make sure animatingRect is on line between toRect & fromRect
            (animatingRect.top - toRect.top) / (animatingRect.left - toRect.left) === (fromRect.top - toRect.top) / (fromRect.left - toRect.left)) {
              // If returning to same place as started from animation and on same axis
              time = calculateRealTime(animatingRect, prevFromRect, prevToRect, _this.options);
            }
          } // if fromRect != toRect: animate


          if (!isRectEqual(toRect, fromRect)) {
            target.prevFromRect = fromRect;
            target.prevToRect = toRect;

            if (!time) {
              time = _this.options.animation;
            }

            _this.animate(target, animatingRect, time);
          }

          if (time) {
            animating = true;
            animationTime = Math.max(animationTime, time);
            clearTimeout(target.animationResetTimer);
            target.animationResetTimer = setTimeout(function () {
              target.animationTime = 0;
              target.prevFromRect = null;
              target.fromRect = null;
              target.prevToRect = null;
              target.thisAnimationDuration = null;
            }, time);
            target.thisAnimationDuration = time;
          }
        });
        clearTimeout(animationCallbackId);

        if (!animating) {
          if (typeof callback === 'function') callback();
        } else {
          animationCallbackId = setTimeout(function () {
            if (typeof callback === 'function') callback();
          }, animationTime);
        }

        animationStates = [];
      },
      animate: function animate(target, prev, duration) {
        if (duration) {
          css(target, 'transition', '');
          css(target, 'transform', '');
          var currentRect = getRect(target),
              elMatrix = matrix(this.el),
              scaleX = elMatrix && elMatrix.a,
              scaleY = elMatrix && elMatrix.d,
              translateX = (prev.left - currentRect.left) / (scaleX || 1),
              translateY = (prev.top - currentRect.top) / (scaleY || 1);
          target.animatingX = !!translateX;
          target.animatingY = !!translateY;
          css(target, 'transform', 'translate3d(' + translateX + 'px,' + translateY + 'px,0)');
          repaint(target); // repaint

          css(target, 'transition', 'transform ' + duration + 'ms' + (this.options.easing ? ' ' + this.options.easing : ''));
          css(target, 'transform', 'translate3d(0,0,0)');
          typeof target.animated === 'number' && clearTimeout(target.animated);
          target.animated = setTimeout(function () {
            css(target, 'transition', '');
            css(target, 'transform', '');
            target.animated = false;
            target.animatingX = false;
            target.animatingY = false;
          }, duration);
        }
      }
    };
  }

  function repaint(target) {
    return target.offsetWidth;
  }

  function calculateRealTime(animatingRect, fromRect, toRect, options) {
    return Math.sqrt(Math.pow(fromRect.top - animatingRect.top, 2) + Math.pow(fromRect.left - animatingRect.left, 2)) / Math.sqrt(Math.pow(fromRect.top - toRect.top, 2) + Math.pow(fromRect.left - toRect.left, 2)) * options.animation;
  }

  var plugins = [];
  var defaults = {
    initializeByDefault: true
  };
  var PluginManager = {
    mount: function mount(plugin) {
      // Set default static properties
      for (var option in defaults) {
        if (defaults.hasOwnProperty(option) && !(option in plugin)) {
          plugin[option] = defaults[option];
        }
      }

      plugins.push(plugin);
    },
    pluginEvent: function pluginEvent(eventName, sortable, evt) {
      var _this = this;

      this.eventCanceled = false;
      var eventNameGlobal = eventName + 'Global';
      plugins.forEach(function (plugin) {
        if (!sortable[plugin.pluginName]) return; // Fire global events if it exists in this sortable

        if (sortable[plugin.pluginName][eventNameGlobal]) {
          _this.eventCanceled = !!sortable[plugin.pluginName][eventNameGlobal](_objectSpread({
            sortable: sortable
          }, evt));
        } // Only fire plugin event if plugin is enabled in this sortable,
        // and plugin has event defined


        if (sortable.options[plugin.pluginName] && sortable[plugin.pluginName][eventName]) {
          _this.eventCanceled = _this.eventCanceled || !!sortable[plugin.pluginName][eventName](_objectSpread({
            sortable: sortable
          }, evt));
        }
      });
    },
    initializePlugins: function initializePlugins(sortable, el, defaults) {
      plugins.forEach(function (plugin) {
        var pluginName = plugin.pluginName;
        if (!sortable.options[pluginName] && !plugin.initializeByDefault) return;
        var initialized = new plugin(sortable, el);
        initialized.sortable = sortable;
        sortable[pluginName] = initialized; // Add default options from plugin

        _extends(defaults, initialized.options);
      });

      for (var option in sortable.options) {
        if (!sortable.options.hasOwnProperty(option)) continue;
        var modified = this.modifyOption(sortable, option, sortable.options[option]);

        if (typeof modified !== 'undefined') {
          sortable.options[option] = modified;
        }
      }
    },
    getEventOptions: function getEventOptions(name, sortable) {
      var eventOptions = {};
      plugins.forEach(function (plugin) {
        if (typeof plugin.eventOptions !== 'function') return;

        _extends(eventOptions, plugin.eventOptions.call(sortable, name));
      });
      return eventOptions;
    },
    modifyOption: function modifyOption(sortable, name, value) {
      var modifiedValue;
      plugins.forEach(function (plugin) {
        // Plugin must exist on the Sortable
        if (!sortable[plugin.pluginName]) return; // If static option listener exists for this option, call in the context of the Sortable's instance of this plugin

        if (plugin.optionListeners && typeof plugin.optionListeners[name] === 'function') {
          modifiedValue = plugin.optionListeners[name].call(sortable[plugin.pluginName], value);
        }
      });
      return modifiedValue;
    }
  };

  function dispatchEvent(_ref) {
    var sortable = _ref.sortable,
        rootEl = _ref.rootEl,
        name = _ref.name,
        targetEl = _ref.targetEl,
        cloneEl = _ref.cloneEl,
        toEl = _ref.toEl,
        fromEl = _ref.fromEl,
        oldIndex = _ref.oldIndex,
        newIndex = _ref.newIndex,
        oldDraggableIndex = _ref.oldDraggableIndex,
        newDraggableIndex = _ref.newDraggableIndex,
        originalEvent = _ref.originalEvent,
        putSortable = _ref.putSortable,
        eventOptions = _ref.eventOptions;
    sortable = sortable || rootEl[expando];
    var evt,
        options = sortable.options,
        onName = 'on' + name.charAt(0).toUpperCase() + name.substr(1); // Support for new CustomEvent feature

    if (window.CustomEvent && !IE11OrLess && !Edge) {
      evt = new CustomEvent(name, {
        bubbles: true,
        cancelable: true
      });
    } else {
      evt = document.createEvent('Event');
      evt.initEvent(name, true, true);
    }

    evt.to = toEl || rootEl;
    evt.from = fromEl || rootEl;
    evt.item = targetEl || rootEl;
    evt.clone = cloneEl;
    evt.oldIndex = oldIndex;
    evt.newIndex = newIndex;
    evt.oldDraggableIndex = oldDraggableIndex;
    evt.newDraggableIndex = newDraggableIndex;
    evt.originalEvent = originalEvent;
    evt.pullMode = putSortable ? putSortable.lastPutMode : undefined;

    var allEventOptions = _objectSpread({}, eventOptions, PluginManager.getEventOptions(name, sortable));

    for (var option in allEventOptions) {
      evt[option] = allEventOptions[option];
    }

    if (rootEl) {
      rootEl.dispatchEvent(evt);
    }

    if (options[onName]) {
      options[onName].call(sortable, evt);
    }
  }

  var pluginEvent = function pluginEvent(eventName, sortable) {
    var _ref = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
        originalEvent = _ref.evt,
        data = _objectWithoutProperties(_ref, ["evt"]);

    PluginManager.pluginEvent.bind(Sortable)(eventName, sortable, _objectSpread({
      dragEl: dragEl,
      parentEl: parentEl,
      ghostEl: ghostEl,
      rootEl: rootEl,
      nextEl: nextEl,
      lastDownEl: lastDownEl,
      cloneEl: cloneEl,
      cloneHidden: cloneHidden,
      dragStarted: moved,
      putSortable: putSortable,
      activeSortable: Sortable.active,
      originalEvent: originalEvent,
      oldIndex: oldIndex,
      oldDraggableIndex: oldDraggableIndex,
      newIndex: newIndex,
      newDraggableIndex: newDraggableIndex,
      hideGhostForTarget: _hideGhostForTarget,
      unhideGhostForTarget: _unhideGhostForTarget,
      cloneNowHidden: function cloneNowHidden() {
        cloneHidden = true;
      },
      cloneNowShown: function cloneNowShown() {
        cloneHidden = false;
      },
      dispatchSortableEvent: function dispatchSortableEvent(name) {
        _dispatchEvent({
          sortable: sortable,
          name: name,
          originalEvent: originalEvent
        });
      }
    }, data));
  };

  function _dispatchEvent(info) {
    dispatchEvent(_objectSpread({
      putSortable: putSortable,
      cloneEl: cloneEl,
      targetEl: dragEl,
      rootEl: rootEl,
      oldIndex: oldIndex,
      oldDraggableIndex: oldDraggableIndex,
      newIndex: newIndex,
      newDraggableIndex: newDraggableIndex
    }, info));
  }

  if (typeof window === "undefined" || !window.document) {
    throw new Error("Sortable.js requires a window with a document");
  }

  var dragEl,
      parentEl,
      ghostEl,
      rootEl,
      nextEl,
      lastDownEl,
      cloneEl,
      cloneHidden,
      oldIndex,
      newIndex,
      oldDraggableIndex,
      newDraggableIndex,
      activeGroup,
      putSortable,
      awaitingDragStarted = false,
      ignoreNextClick = false,
      sortables = [],
      tapEvt,
      touchEvt,
      moved,
      lastTarget,
      lastDirection,
      pastFirstInvertThresh = false,
      isCircumstantialInvert = false,
      targetMoveDistance,
      // For positioning ghost absolutely
  ghostRelativeParent,
      ghostRelativeParentInitialScroll = [],
      // (left, top)
  _silent = false,
      savedInputChecked = [];
  /** @const */

  var PositionGhostAbsolutely = IOS,
      CSSFloatProperty = Edge || IE11OrLess ? 'cssFloat' : 'float',
      // This will not pass for IE9, because IE9 DnD only works on anchors
  supportDraggable = !ChromeForAndroid && !IOS && 'draggable' in document.createElement('div'),
      supportCssPointerEvents = function () {
    // false when <= IE11
    if (IE11OrLess) {
      return false;
    }

    var el = document.createElement('x');
    el.style.cssText = 'pointer-events:auto';
    return el.style.pointerEvents === 'auto';
  }(),
      _detectDirection = function _detectDirection(el, options) {
    var elCSS = css(el),
        elWidth = parseInt(elCSS.width) - parseInt(elCSS.paddingLeft) - parseInt(elCSS.paddingRight) - parseInt(elCSS.borderLeftWidth) - parseInt(elCSS.borderRightWidth),
        child1 = getChild(el, 0, options),
        child2 = getChild(el, 1, options),
        firstChildCSS = child1 && css(child1),
        secondChildCSS = child2 && css(child2),
        firstChildWidth = firstChildCSS && parseInt(firstChildCSS.marginLeft) + parseInt(firstChildCSS.marginRight) + getRect(child1).width,
        secondChildWidth = secondChildCSS && parseInt(secondChildCSS.marginLeft) + parseInt(secondChildCSS.marginRight) + getRect(child2).width;

    if (elCSS.display === 'flex') {
      return elCSS.flexDirection === 'column' || elCSS.flexDirection === 'column-reverse' ? 'vertical' : 'horizontal';
    }

    if (elCSS.display === 'grid') {
      return elCSS.gridTemplateColumns.split(' ').length <= 1 ? 'vertical' : 'horizontal';
    }

    if (child1 && firstChildCSS["float"] !== 'none') {
      var touchingSideChild2 = firstChildCSS["float"] === 'left' ? 'left' : 'right';
      return child2 && (secondChildCSS.clear === 'both' || secondChildCSS.clear === touchingSideChild2) ? 'vertical' : 'horizontal';
    }

    return child1 && (firstChildCSS.display === 'block' || firstChildCSS.display === 'flex' || firstChildCSS.display === 'table' || firstChildCSS.display === 'grid' || firstChildWidth >= elWidth && elCSS[CSSFloatProperty] === 'none' || child2 && elCSS[CSSFloatProperty] === 'none' && firstChildWidth + secondChildWidth > elWidth) ? 'vertical' : 'horizontal';
  },
      _dragElInRowColumn = function _dragElInRowColumn(dragRect, targetRect, vertical) {
    var dragElS1Opp = vertical ? dragRect.left : dragRect.top,
        dragElS2Opp = vertical ? dragRect.right : dragRect.bottom,
        dragElOppLength = vertical ? dragRect.width : dragRect.height,
        targetS1Opp = vertical ? targetRect.left : targetRect.top,
        targetS2Opp = vertical ? targetRect.right : targetRect.bottom,
        targetOppLength = vertical ? targetRect.width : targetRect.height;
    return dragElS1Opp === targetS1Opp || dragElS2Opp === targetS2Opp || dragElS1Opp + dragElOppLength / 2 === targetS1Opp + targetOppLength / 2;
  },

  /**
   * Detects first nearest empty sortable to X and Y position using emptyInsertThreshold.
   * @param  {Number} x      X position
   * @param  {Number} y      Y position
   * @return {HTMLElement}   Element of the first found nearest Sortable
   */
  _detectNearestEmptySortable = function _detectNearestEmptySortable(x, y) {
    var ret;
    sortables.some(function (sortable) {
      if (lastChild(sortable)) return;
      var rect = getRect(sortable),
          threshold = sortable[expando].options.emptyInsertThreshold,
          insideHorizontally = x >= rect.left - threshold && x <= rect.right + threshold,
          insideVertically = y >= rect.top - threshold && y <= rect.bottom + threshold;

      if (threshold && insideHorizontally && insideVertically) {
        return ret = sortable;
      }
    });
    return ret;
  },
      _prepareGroup = function _prepareGroup(options) {
    function toFn(value, pull) {
      return function (to, from, dragEl, evt) {
        var sameGroup = to.options.group.name && from.options.group.name && to.options.group.name === from.options.group.name;

        if (value == null && (pull || sameGroup)) {
          // Default pull value
          // Default pull and put value if same group
          return true;
        } else if (value == null || value === false) {
          return false;
        } else if (pull && value === 'clone') {
          return value;
        } else if (typeof value === 'function') {
          return toFn(value(to, from, dragEl, evt), pull)(to, from, dragEl, evt);
        } else {
          var otherGroup = (pull ? to : from).options.group.name;
          return value === true || typeof value === 'string' && value === otherGroup || value.join && value.indexOf(otherGroup) > -1;
        }
      };
    }

    var group = {};
    var originalGroup = options.group;

    if (!originalGroup || _typeof(originalGroup) != 'object') {
      originalGroup = {
        name: originalGroup
      };
    }

    group.name = originalGroup.name;
    group.checkPull = toFn(originalGroup.pull, true);
    group.checkPut = toFn(originalGroup.put);
    group.revertClone = originalGroup.revertClone;
    options.group = group;
  },
      _hideGhostForTarget = function _hideGhostForTarget() {
    if (!supportCssPointerEvents && ghostEl) {
      css(ghostEl, 'display', 'none');
    }
  },
      _unhideGhostForTarget = function _unhideGhostForTarget() {
    if (!supportCssPointerEvents && ghostEl) {
      css(ghostEl, 'display', '');
    }
  }; // #1184 fix - Prevent click event on fallback if dragged but item not changed position


  document.addEventListener('click', function (evt) {
    if (ignoreNextClick) {
      evt.preventDefault();
      evt.stopPropagation && evt.stopPropagation();
      evt.stopImmediatePropagation && evt.stopImmediatePropagation();
      ignoreNextClick = false;
      return false;
    }
  }, true);

  var nearestEmptyInsertDetectEvent = function nearestEmptyInsertDetectEvent(evt) {
    if (dragEl) {
      evt = evt.touches ? evt.touches[0] : evt;

      var nearest = _detectNearestEmptySortable(evt.clientX, evt.clientY);

      if (nearest) {
        // Create imitation event
        var event = {};

        for (var i in evt) {
          if (evt.hasOwnProperty(i)) {
            event[i] = evt[i];
          }
        }

        event.target = event.rootEl = nearest;
        event.preventDefault = void 0;
        event.stopPropagation = void 0;

        nearest[expando]._onDragOver(event);
      }
    }
  };

  var _checkOutsideTargetEl = function _checkOutsideTargetEl(evt) {
    if (dragEl) {
      dragEl.parentNode[expando]._isOutsideThisEl(evt.target);
    }
  };
  /**
   * @class  Sortable
   * @param  {HTMLElement}  el
   * @param  {Object}       [options]
   */


  function Sortable(el, options) {
    if (!(el && el.nodeType && el.nodeType === 1)) {
      throw "Sortable: `el` must be an HTMLElement, not ".concat({}.toString.call(el));
    }

    this.el = el; // root element

    this.options = options = _extends({}, options); // Export instance

    el[expando] = this;
    var defaults = {
      group: null,
      sort: true,
      disabled: false,
      store: null,
      handle: null,
      draggable: /^[uo]l$/i.test(el.nodeName) ? '>li' : '>*',
      swapThreshold: 1,
      // percentage; 0 <= x <= 1
      invertSwap: false,
      // invert always
      invertedSwapThreshold: null,
      // will be set to same as swapThreshold if default
      removeCloneOnHide: true,
      direction: function direction() {
        return _detectDirection(el, this.options);
      },
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      ignore: 'a, img',
      filter: null,
      preventOnFilter: true,
      animation: 0,
      easing: null,
      setData: function setData(dataTransfer, dragEl) {
        dataTransfer.setData('Text', dragEl.textContent);
      },
      dropBubble: false,
      dragoverBubble: false,
      dataIdAttr: 'data-id',
      delay: 0,
      delayOnTouchOnly: false,
      touchStartThreshold: (Number.parseInt ? Number : window).parseInt(window.devicePixelRatio, 10) || 1,
      forceFallback: false,
      fallbackClass: 'sortable-fallback',
      fallbackOnBody: false,
      fallbackTolerance: 0,
      fallbackOffset: {
        x: 0,
        y: 0
      },
      supportPointer: Sortable.supportPointer !== false && 'PointerEvent' in window,
      emptyInsertThreshold: 5
    };
    PluginManager.initializePlugins(this, el, defaults); // Set default options

    for (var name in defaults) {
      !(name in options) && (options[name] = defaults[name]);
    }

    _prepareGroup(options); // Bind all private methods


    for (var fn in this) {
      if (fn.charAt(0) === '_' && typeof this[fn] === 'function') {
        this[fn] = this[fn].bind(this);
      }
    } // Setup drag mode


    this.nativeDraggable = options.forceFallback ? false : supportDraggable;

    if (this.nativeDraggable) {
      // Touch start threshold cannot be greater than the native dragstart threshold
      this.options.touchStartThreshold = 1;
    } // Bind events


    if (options.supportPointer) {
      on(el, 'pointerdown', this._onTapStart);
    } else {
      on(el, 'mousedown', this._onTapStart);
      on(el, 'touchstart', this._onTapStart);
    }

    if (this.nativeDraggable) {
      on(el, 'dragover', this);
      on(el, 'dragenter', this);
    }

    sortables.push(this.el); // Restore sorting

    options.store && options.store.get && this.sort(options.store.get(this) || []); // Add animation state manager

    _extends(this, AnimationStateManager());
  }

  Sortable.prototype =
  /** @lends Sortable.prototype */
  {
    constructor: Sortable,
    _isOutsideThisEl: function _isOutsideThisEl(target) {
      if (!this.el.contains(target) && target !== this.el) {
        lastTarget = null;
      }
    },
    _getDirection: function _getDirection(evt, target) {
      return typeof this.options.direction === 'function' ? this.options.direction.call(this, evt, target, dragEl) : this.options.direction;
    },
    _onTapStart: function _onTapStart(
    /** Event|TouchEvent */
    evt) {
      if (!evt.cancelable) return;

      var _this = this,
          el = this.el,
          options = this.options,
          preventOnFilter = options.preventOnFilter,
          type = evt.type,
          touch = evt.touches && evt.touches[0],
          target = (touch || evt).target,
          originalTarget = evt.target.shadowRoot && (evt.path && evt.path[0] || evt.composedPath && evt.composedPath()[0]) || target,
          filter = options.filter;

      _saveInputCheckedState(el); // Don't trigger start event when an element is been dragged, otherwise the evt.oldindex always wrong when set option.group.


      if (dragEl) {
        return;
      }

      if (/mousedown|pointerdown/.test(type) && evt.button !== 0 || options.disabled) {
        return; // only left button and enabled
      } // cancel dnd if original target is content editable


      if (originalTarget.isContentEditable) {
        return;
      }

      target = closest(target, options.draggable, el, false);

      if (target && target.animated) {
        return;
      }

      if (lastDownEl === target) {
        // Ignoring duplicate `down`
        return;
      } // Get the index of the dragged element within its parent


      oldIndex = index(target);
      oldDraggableIndex = index(target, options.draggable); // Check filter

      if (typeof filter === 'function') {
        if (filter.call(this, evt, target, this)) {
          _dispatchEvent({
            sortable: _this,
            rootEl: originalTarget,
            name: 'filter',
            targetEl: target,
            toEl: el,
            fromEl: el
          });

          pluginEvent('filter', _this, {
            evt: evt
          });
          preventOnFilter && evt.cancelable && evt.preventDefault();
          return; // cancel dnd
        }
      } else if (filter) {
        filter = filter.split(',').some(function (criteria) {
          criteria = closest(originalTarget, criteria.trim(), el, false);

          if (criteria) {
            _dispatchEvent({
              sortable: _this,
              rootEl: criteria,
              name: 'filter',
              targetEl: target,
              fromEl: el,
              toEl: el
            });

            pluginEvent('filter', _this, {
              evt: evt
            });
            return true;
          }
        });

        if (filter) {
          preventOnFilter && evt.cancelable && evt.preventDefault();
          return; // cancel dnd
        }
      }

      if (options.handle && !closest(originalTarget, options.handle, el, false)) {
        return;
      } // Prepare `dragstart`


      this._prepareDragStart(evt, touch, target);
    },
    _prepareDragStart: function _prepareDragStart(
    /** Event */
    evt,
    /** Touch */
    touch,
    /** HTMLElement */
    target) {
      var _this = this,
          el = _this.el,
          options = _this.options,
          ownerDocument = el.ownerDocument,
          dragStartFn;

      if (target && !dragEl && target.parentNode === el) {
        rootEl = el;
        dragEl = target;
        parentEl = dragEl.parentNode;
        nextEl = dragEl.nextSibling;
        lastDownEl = target;
        activeGroup = options.group;
        Sortable.dragged = dragEl;
        tapEvt = {
          target: dragEl,
          clientX: (touch || evt).clientX,
          clientY: (touch || evt).clientY
        };
        this._lastX = (touch || evt).clientX;
        this._lastY = (touch || evt).clientY;
        dragEl.style['will-change'] = 'all';

        dragStartFn = function dragStartFn() {
          pluginEvent('delayEnded', _this, {
            evt: evt
          });

          if (Sortable.eventCanceled) {
            _this._onDrop();

            return;
          } // Delayed drag has been triggered
          // we can re-enable the events: touchmove/mousemove


          _this._disableDelayedDragEvents();

          if (!FireFox && _this.nativeDraggable) {
            dragEl.draggable = true;
          } // Bind the events: dragstart/dragend


          _this._triggerDragStart(evt, touch); // Drag start event


          _dispatchEvent({
            sortable: _this,
            name: 'choose',
            originalEvent: evt
          }); // Chosen item


          toggleClass(dragEl, options.chosenClass, true);
        }; // Disable "draggable"


        options.ignore.split(',').forEach(function (criteria) {
          find(dragEl, criteria.trim(), _disableDraggable);
        });
        on(ownerDocument, 'dragover', nearestEmptyInsertDetectEvent);
        on(ownerDocument, 'mousemove', nearestEmptyInsertDetectEvent);
        on(ownerDocument, 'touchmove', nearestEmptyInsertDetectEvent);
        on(ownerDocument, 'mouseup', _this._onDrop);
        on(ownerDocument, 'touchend', _this._onDrop);
        on(ownerDocument, 'touchcancel', _this._onDrop); // Make dragEl draggable (must be before delay for FireFox)

        if (FireFox && this.nativeDraggable) {
          this.options.touchStartThreshold = 4;
          dragEl.draggable = true;
        }

        pluginEvent('delayStart', this, {
          evt: evt
        }); // Delay is impossible for native DnD in Edge or IE

        if (options.delay && (!options.delayOnTouchOnly || touch) && (!this.nativeDraggable || !(Edge || IE11OrLess))) {
          if (Sortable.eventCanceled) {
            this._onDrop();

            return;
          } // If the user moves the pointer or let go the click or touch
          // before the delay has been reached:
          // disable the delayed drag


          on(ownerDocument, 'mouseup', _this._disableDelayedDrag);
          on(ownerDocument, 'touchend', _this._disableDelayedDrag);
          on(ownerDocument, 'touchcancel', _this._disableDelayedDrag);
          on(ownerDocument, 'mousemove', _this._delayedDragTouchMoveHandler);
          on(ownerDocument, 'touchmove', _this._delayedDragTouchMoveHandler);
          options.supportPointer && on(ownerDocument, 'pointermove', _this._delayedDragTouchMoveHandler);
          _this._dragStartTimer = setTimeout(dragStartFn, options.delay);
        } else {
          dragStartFn();
        }
      }
    },
    _delayedDragTouchMoveHandler: function _delayedDragTouchMoveHandler(
    /** TouchEvent|PointerEvent **/
    e) {
      var touch = e.touches ? e.touches[0] : e;

      if (Math.max(Math.abs(touch.clientX - this._lastX), Math.abs(touch.clientY - this._lastY)) >= Math.floor(this.options.touchStartThreshold / (this.nativeDraggable && window.devicePixelRatio || 1))) {
        this._disableDelayedDrag();
      }
    },
    _disableDelayedDrag: function _disableDelayedDrag() {
      dragEl && _disableDraggable(dragEl);
      clearTimeout(this._dragStartTimer);

      this._disableDelayedDragEvents();
    },
    _disableDelayedDragEvents: function _disableDelayedDragEvents() {
      var ownerDocument = this.el.ownerDocument;
      off(ownerDocument, 'mouseup', this._disableDelayedDrag);
      off(ownerDocument, 'touchend', this._disableDelayedDrag);
      off(ownerDocument, 'touchcancel', this._disableDelayedDrag);
      off(ownerDocument, 'mousemove', this._delayedDragTouchMoveHandler);
      off(ownerDocument, 'touchmove', this._delayedDragTouchMoveHandler);
      off(ownerDocument, 'pointermove', this._delayedDragTouchMoveHandler);
    },
    _triggerDragStart: function _triggerDragStart(
    /** Event */
    evt,
    /** Touch */
    touch) {
      touch = touch || evt.pointerType == 'touch' && evt;

      if (!this.nativeDraggable || touch) {
        if (this.options.supportPointer) {
          on(document, 'pointermove', this._onTouchMove);
        } else if (touch) {
          on(document, 'touchmove', this._onTouchMove);
        } else {
          on(document, 'mousemove', this._onTouchMove);
        }
      } else {
        on(dragEl, 'dragend', this);
        on(rootEl, 'dragstart', this._onDragStart);
      }

      try {
        if (document.selection) {
          // Timeout neccessary for IE9
          _nextTick(function () {
            document.selection.empty();
          });
        } else {
          window.getSelection().removeAllRanges();
        }
      } catch (err) {}
    },
    _dragStarted: function _dragStarted(fallback, evt) {

      awaitingDragStarted = false;

      if (rootEl && dragEl) {
        pluginEvent('dragStarted', this, {
          evt: evt
        });

        if (this.nativeDraggable) {
          on(document, 'dragover', _checkOutsideTargetEl);
        }

        var options = this.options; // Apply effect

        !fallback && toggleClass(dragEl, options.dragClass, false);
        toggleClass(dragEl, options.ghostClass, true);
        Sortable.active = this;
        fallback && this._appendGhost(); // Drag start event

        _dispatchEvent({
          sortable: this,
          name: 'start',
          originalEvent: evt
        });
      } else {
        this._nulling();
      }
    },
    _emulateDragOver: function _emulateDragOver() {
      if (touchEvt) {
        this._lastX = touchEvt.clientX;
        this._lastY = touchEvt.clientY;

        _hideGhostForTarget();

        var target = document.elementFromPoint(touchEvt.clientX, touchEvt.clientY);
        var parent = target;

        while (target && target.shadowRoot) {
          target = target.shadowRoot.elementFromPoint(touchEvt.clientX, touchEvt.clientY);
          if (target === parent) break;
          parent = target;
        }

        dragEl.parentNode[expando]._isOutsideThisEl(target);

        if (parent) {
          do {
            if (parent[expando]) {
              var inserted = void 0;
              inserted = parent[expando]._onDragOver({
                clientX: touchEvt.clientX,
                clientY: touchEvt.clientY,
                target: target,
                rootEl: parent
              });

              if (inserted && !this.options.dragoverBubble) {
                break;
              }
            }

            target = parent; // store last element
          }
          /* jshint boss:true */
          while (parent = parent.parentNode);
        }

        _unhideGhostForTarget();
      }
    },
    _onTouchMove: function _onTouchMove(
    /**TouchEvent*/
    evt) {
      if (tapEvt) {
        var options = this.options,
            fallbackTolerance = options.fallbackTolerance,
            fallbackOffset = options.fallbackOffset,
            touch = evt.touches ? evt.touches[0] : evt,
            ghostMatrix = ghostEl && matrix(ghostEl),
            scaleX = ghostEl && ghostMatrix && ghostMatrix.a,
            scaleY = ghostEl && ghostMatrix && ghostMatrix.d,
            relativeScrollOffset = PositionGhostAbsolutely && ghostRelativeParent && getRelativeScrollOffset(ghostRelativeParent),
            dx = (touch.clientX - tapEvt.clientX + fallbackOffset.x) / (scaleX || 1) + (relativeScrollOffset ? relativeScrollOffset[0] - ghostRelativeParentInitialScroll[0] : 0) / (scaleX || 1),
            dy = (touch.clientY - tapEvt.clientY + fallbackOffset.y) / (scaleY || 1) + (relativeScrollOffset ? relativeScrollOffset[1] - ghostRelativeParentInitialScroll[1] : 0) / (scaleY || 1),
            translate3d = evt.touches ? 'translate3d(' + dx + 'px,' + dy + 'px,0)' : 'translate(' + dx + 'px,' + dy + 'px)'; // only set the status to dragging, when we are actually dragging

        if (!Sortable.active && !awaitingDragStarted) {
          if (fallbackTolerance && Math.max(Math.abs(touch.clientX - this._lastX), Math.abs(touch.clientY - this._lastY)) < fallbackTolerance) {
            return;
          }

          this._onDragStart(evt, true);
        }

        touchEvt = touch;
        css(ghostEl, 'webkitTransform', translate3d);
        css(ghostEl, 'mozTransform', translate3d);
        css(ghostEl, 'msTransform', translate3d);
        css(ghostEl, 'transform', translate3d);
        evt.cancelable && evt.preventDefault();
      }
    },
    _appendGhost: function _appendGhost() {
      // Bug if using scale(): https://stackoverflow.com/questions/2637058
      // Not being adjusted for
      if (!ghostEl) {
        var container = this.options.fallbackOnBody ? document.body : rootEl,
            rect = getRect(dragEl, true, PositionGhostAbsolutely, true, container),
            options = this.options; // Position absolutely

        if (PositionGhostAbsolutely) {
          // Get relatively positioned parent
          ghostRelativeParent = container;

          while (css(ghostRelativeParent, 'position') === 'static' && css(ghostRelativeParent, 'transform') === 'none' && ghostRelativeParent !== document) {
            ghostRelativeParent = ghostRelativeParent.parentNode;
          }

          if (ghostRelativeParent !== document.body && ghostRelativeParent !== document.documentElement) {
            if (ghostRelativeParent === document) ghostRelativeParent = getWindowScrollingElement();
            rect.top += ghostRelativeParent.scrollTop;
            rect.left += ghostRelativeParent.scrollLeft;
          } else {
            ghostRelativeParent = getWindowScrollingElement();
          }

          ghostRelativeParentInitialScroll = getRelativeScrollOffset(ghostRelativeParent);
        }

        ghostEl = dragEl.cloneNode(true);
        toggleClass(ghostEl, options.ghostClass, false);
        toggleClass(ghostEl, options.fallbackClass, true);
        toggleClass(ghostEl, options.dragClass, true);
        css(ghostEl, 'transition', '');
        css(ghostEl, 'transform', '');
        css(ghostEl, 'box-sizing', 'border-box');
        css(ghostEl, 'margin', 0);
        css(ghostEl, 'top', rect.top);
        css(ghostEl, 'left', rect.left);
        css(ghostEl, 'width', rect.width);
        css(ghostEl, 'height', rect.height);
        css(ghostEl, 'opacity', '0.8');
        css(ghostEl, 'position', PositionGhostAbsolutely ? 'absolute' : 'fixed');
        css(ghostEl, 'zIndex', '100000');
        css(ghostEl, 'pointerEvents', 'none');
        Sortable.ghost = ghostEl;
        container.appendChild(ghostEl);
      }
    },
    _onDragStart: function _onDragStart(
    /**Event*/
    evt,
    /**boolean*/
    fallback) {
      var _this = this;

      var dataTransfer = evt.dataTransfer;
      var options = _this.options;
      pluginEvent('dragStart', this, {
        evt: evt
      });

      if (Sortable.eventCanceled) {
        this._onDrop();

        return;
      }

      pluginEvent('setupClone', this);

      if (!Sortable.eventCanceled) {
        cloneEl = clone(dragEl);
        cloneEl.draggable = false;
        cloneEl.style['will-change'] = '';

        this._hideClone();

        toggleClass(cloneEl, this.options.chosenClass, false);
        Sortable.clone = cloneEl;
      } // #1143: IFrame support workaround


      _this.cloneId = _nextTick(function () {
        pluginEvent('clone', _this);
        if (Sortable.eventCanceled) return;

        if (!_this.options.removeCloneOnHide) {
          rootEl.insertBefore(cloneEl, dragEl);
        }

        _this._hideClone();

        _dispatchEvent({
          sortable: _this,
          name: 'clone'
        });
      });
      !fallback && toggleClass(dragEl, options.dragClass, true); // Set proper drop events

      if (fallback) {
        ignoreNextClick = true;
        _this._loopId = setInterval(_this._emulateDragOver, 50);
      } else {
        // Undo what was set in _prepareDragStart before drag started
        off(document, 'mouseup', _this._onDrop);
        off(document, 'touchend', _this._onDrop);
        off(document, 'touchcancel', _this._onDrop);

        if (dataTransfer) {
          dataTransfer.effectAllowed = 'move';
          options.setData && options.setData.call(_this, dataTransfer, dragEl);
        }

        on(document, 'drop', _this); // #1276 fix:

        css(dragEl, 'transform', 'translateZ(0)');
      }

      awaitingDragStarted = true;
      _this._dragStartId = _nextTick(_this._dragStarted.bind(_this, fallback, evt));
      on(document, 'selectstart', _this);
      moved = true;

      if (Safari) {
        css(document.body, 'user-select', 'none');
      }
    },
    // Returns true - if no further action is needed (either inserted or another condition)
    _onDragOver: function _onDragOver(
    /**Event*/
    evt) {
      var el = this.el,
          target = evt.target,
          dragRect,
          targetRect,
          revert,
          options = this.options,
          group = options.group,
          activeSortable = Sortable.active,
          isOwner = activeGroup === group,
          canSort = options.sort,
          fromSortable = putSortable || activeSortable,
          vertical,
          _this = this,
          completedFired = false;

      if (_silent) return;

      function dragOverEvent(name, extra) {
        pluginEvent(name, _this, _objectSpread({
          evt: evt,
          isOwner: isOwner,
          axis: vertical ? 'vertical' : 'horizontal',
          revert: revert,
          dragRect: dragRect,
          targetRect: targetRect,
          canSort: canSort,
          fromSortable: fromSortable,
          target: target,
          completed: completed,
          onMove: function onMove(target, after) {
            return _onMove(rootEl, el, dragEl, dragRect, target, getRect(target), evt, after);
          },
          changed: changed
        }, extra));
      } // Capture animation state


      function capture() {
        dragOverEvent('dragOverAnimationCapture');

        _this.captureAnimationState();

        if (_this !== fromSortable) {
          fromSortable.captureAnimationState();
        }
      } // Return invocation when dragEl is inserted (or completed)


      function completed(insertion) {
        dragOverEvent('dragOverCompleted', {
          insertion: insertion
        });

        if (insertion) {
          // Clones must be hidden before folding animation to capture dragRectAbsolute properly
          if (isOwner) {
            activeSortable._hideClone();
          } else {
            activeSortable._showClone(_this);
          }

          if (_this !== fromSortable) {
            // Set ghost class to new sortable's ghost class
            toggleClass(dragEl, putSortable ? putSortable.options.ghostClass : activeSortable.options.ghostClass, false);
            toggleClass(dragEl, options.ghostClass, true);
          }

          if (putSortable !== _this && _this !== Sortable.active) {
            putSortable = _this;
          } else if (_this === Sortable.active && putSortable) {
            putSortable = null;
          } // Animation


          if (fromSortable === _this) {
            _this._ignoreWhileAnimating = target;
          }

          _this.animateAll(function () {
            dragOverEvent('dragOverAnimationComplete');
            _this._ignoreWhileAnimating = null;
          });

          if (_this !== fromSortable) {
            fromSortable.animateAll();
            fromSortable._ignoreWhileAnimating = null;
          }
        } // Null lastTarget if it is not inside a previously swapped element


        if (target === dragEl && !dragEl.animated || target === el && !target.animated) {
          lastTarget = null;
        } // no bubbling and not fallback


        if (!options.dragoverBubble && !evt.rootEl && target !== document) {
          dragEl.parentNode[expando]._isOutsideThisEl(evt.target); // Do not detect for empty insert if already inserted


          !insertion && nearestEmptyInsertDetectEvent(evt);
        }

        !options.dragoverBubble && evt.stopPropagation && evt.stopPropagation();
        return completedFired = true;
      } // Call when dragEl has been inserted


      function changed() {
        newIndex = index(dragEl);
        newDraggableIndex = index(dragEl, options.draggable);

        _dispatchEvent({
          sortable: _this,
          name: 'change',
          toEl: el,
          newIndex: newIndex,
          newDraggableIndex: newDraggableIndex,
          originalEvent: evt
        });
      }

      if (evt.preventDefault !== void 0) {
        evt.cancelable && evt.preventDefault();
      }

      target = closest(target, options.draggable, el, true);
      dragOverEvent('dragOver');
      if (Sortable.eventCanceled) return completedFired;

      if (dragEl.contains(evt.target) || target.animated && target.animatingX && target.animatingY || _this._ignoreWhileAnimating === target) {
        return completed(false);
      }

      ignoreNextClick = false;

      if (activeSortable && !options.disabled && (isOwner ? canSort || (revert = !rootEl.contains(dragEl)) // Reverting item into the original list
      : putSortable === this || (this.lastPutMode = activeGroup.checkPull(this, activeSortable, dragEl, evt)) && group.checkPut(this, activeSortable, dragEl, evt))) {
        vertical = this._getDirection(evt, target) === 'vertical';
        dragRect = getRect(dragEl);
        dragOverEvent('dragOverValid');
        if (Sortable.eventCanceled) return completedFired;

        if (revert) {
          parentEl = rootEl; // actualization

          capture();

          this._hideClone();

          dragOverEvent('revert');

          if (!Sortable.eventCanceled) {
            if (nextEl) {
              rootEl.insertBefore(dragEl, nextEl);
            } else {
              rootEl.appendChild(dragEl);
            }
          }

          return completed(true);
        }

        var elLastChild = lastChild(el, options.draggable);

        if (!elLastChild || _ghostIsLast(evt, vertical, this) && !elLastChild.animated) {
          // If already at end of list: Do not insert
          if (elLastChild === dragEl) {
            return completed(false);
          } // assign target only if condition is true


          if (elLastChild && el === evt.target) {
            target = elLastChild;
          }

          if (target) {
            targetRect = getRect(target);
          }

          if (_onMove(rootEl, el, dragEl, dragRect, target, targetRect, evt, !!target) !== false) {
            capture();
            el.appendChild(dragEl);
            parentEl = el; // actualization

            changed();
            return completed(true);
          }
        } else if (target.parentNode === el) {
          targetRect = getRect(target);
          var direction = 0,
              targetBeforeFirstSwap,
              differentLevel = dragEl.parentNode !== el,
              differentRowCol = !_dragElInRowColumn(dragEl.animated && dragEl.toRect || dragRect, target.animated && target.toRect || targetRect, vertical),
              side1 = vertical ? 'top' : 'left',
              scrolledPastTop = isScrolledPast(target, null, 'top', 'top') || isScrolledPast(dragEl, null, 'top', 'top'),
              scrollBefore = scrolledPastTop ? scrolledPastTop.scrollTop : void 0;

          if (lastTarget !== target) {
            targetBeforeFirstSwap = targetRect[side1];
            pastFirstInvertThresh = false;
            isCircumstantialInvert = !differentRowCol && options.invertSwap || differentLevel;
          }

          direction = _getSwapDirection(evt, target, targetRect, vertical, differentRowCol ? 1 : options.swapThreshold, options.invertedSwapThreshold == null ? options.swapThreshold : options.invertedSwapThreshold, isCircumstantialInvert, lastTarget === target);
          var sibling;

          if (direction !== 0) {
            // Check if target is beside dragEl in respective direction (ignoring hidden elements)
            var dragIndex = index(dragEl);

            do {
              dragIndex -= direction;
              sibling = parentEl.children[dragIndex];
            } while (sibling && (css(sibling, 'display') === 'none' || sibling === ghostEl));
          } // If dragEl is already beside target: Do not insert


          if (direction === 0 || sibling === target) {
            return completed(false);
          }

          lastTarget = target;
          lastDirection = direction;
          var nextSibling = target.nextElementSibling,
              after = false;
          after = direction === 1;

          var moveVector = _onMove(rootEl, el, dragEl, dragRect, target, targetRect, evt, after);

          if (moveVector !== false) {
            if (moveVector === 1 || moveVector === -1) {
              after = moveVector === 1;
            }

            _silent = true;
            setTimeout(_unsilent, 30);
            capture();

            if (after && !nextSibling) {
              el.appendChild(dragEl);
            } else {
              target.parentNode.insertBefore(dragEl, after ? nextSibling : target);
            } // Undo chrome's scroll adjustment (has no effect on other browsers)


            if (scrolledPastTop) {
              scrollBy(scrolledPastTop, 0, scrollBefore - scrolledPastTop.scrollTop);
            }

            parentEl = dragEl.parentNode; // actualization
            // must be done before animation

            if (targetBeforeFirstSwap !== undefined && !isCircumstantialInvert) {
              targetMoveDistance = Math.abs(targetBeforeFirstSwap - getRect(target)[side1]);
            }

            changed();
            return completed(true);
          }
        }

        if (el.contains(dragEl)) {
          return completed(false);
        }
      }

      return false;
    },
    _ignoreWhileAnimating: null,
    _offMoveEvents: function _offMoveEvents() {
      off(document, 'mousemove', this._onTouchMove);
      off(document, 'touchmove', this._onTouchMove);
      off(document, 'pointermove', this._onTouchMove);
      off(document, 'dragover', nearestEmptyInsertDetectEvent);
      off(document, 'mousemove', nearestEmptyInsertDetectEvent);
      off(document, 'touchmove', nearestEmptyInsertDetectEvent);
    },
    _offUpEvents: function _offUpEvents() {
      var ownerDocument = this.el.ownerDocument;
      off(ownerDocument, 'mouseup', this._onDrop);
      off(ownerDocument, 'touchend', this._onDrop);
      off(ownerDocument, 'pointerup', this._onDrop);
      off(ownerDocument, 'touchcancel', this._onDrop);
      off(document, 'selectstart', this);
    },
    _onDrop: function _onDrop(
    /**Event*/
    evt) {
      var el = this.el,
          options = this.options; // Get the index of the dragged element within its parent

      newIndex = index(dragEl);
      newDraggableIndex = index(dragEl, options.draggable);
      pluginEvent('drop', this, {
        evt: evt
      }); // Get again after plugin event

      newIndex = index(dragEl);
      newDraggableIndex = index(dragEl, options.draggable);

      if (Sortable.eventCanceled) {
        this._nulling();

        return;
      }

      awaitingDragStarted = false;
      isCircumstantialInvert = false;
      pastFirstInvertThresh = false;
      clearInterval(this._loopId);
      clearTimeout(this._dragStartTimer);

      _cancelNextTick(this.cloneId);

      _cancelNextTick(this._dragStartId); // Unbind events


      if (this.nativeDraggable) {
        off(document, 'drop', this);
        off(el, 'dragstart', this._onDragStart);
      }

      this._offMoveEvents();

      this._offUpEvents();

      if (Safari) {
        css(document.body, 'user-select', '');
      }

      if (evt) {
        if (moved) {
          evt.cancelable && evt.preventDefault();
          !options.dropBubble && evt.stopPropagation();
        }

        ghostEl && ghostEl.parentNode && ghostEl.parentNode.removeChild(ghostEl);

        if (rootEl === parentEl || putSortable && putSortable.lastPutMode !== 'clone') {
          // Remove clone(s)
          cloneEl && cloneEl.parentNode && cloneEl.parentNode.removeChild(cloneEl);
        }

        if (dragEl) {
          if (this.nativeDraggable) {
            off(dragEl, 'dragend', this);
          }

          _disableDraggable(dragEl);

          dragEl.style['will-change'] = ''; // Remove classes
          // ghostClass is added in dragStarted

          if (moved && !awaitingDragStarted) {
            toggleClass(dragEl, putSortable ? putSortable.options.ghostClass : this.options.ghostClass, false);
          }

          toggleClass(dragEl, this.options.chosenClass, false); // Drag stop event

          _dispatchEvent({
            sortable: this,
            name: 'unchoose',
            toEl: parentEl,
            newIndex: null,
            newDraggableIndex: null,
            originalEvent: evt
          });

          if (rootEl !== parentEl) {
            if (newIndex >= 0) {
              // Add event
              _dispatchEvent({
                rootEl: parentEl,
                name: 'add',
                toEl: parentEl,
                fromEl: rootEl,
                originalEvent: evt
              }); // Remove event


              _dispatchEvent({
                sortable: this,
                name: 'remove',
                toEl: parentEl,
                originalEvent: evt
              }); // drag from one list and drop into another


              _dispatchEvent({
                rootEl: parentEl,
                name: 'sort',
                toEl: parentEl,
                fromEl: rootEl,
                originalEvent: evt
              });

              _dispatchEvent({
                sortable: this,
                name: 'sort',
                toEl: parentEl,
                originalEvent: evt
              });
            }

            putSortable && putSortable.save();
          } else {
            if (newIndex !== oldIndex) {
              if (newIndex >= 0) {
                // drag & drop within the same list
                _dispatchEvent({
                  sortable: this,
                  name: 'update',
                  toEl: parentEl,
                  originalEvent: evt
                });

                _dispatchEvent({
                  sortable: this,
                  name: 'sort',
                  toEl: parentEl,
                  originalEvent: evt
                });
              }
            }
          }

          if (Sortable.active) {
            /* jshint eqnull:true */
            if (newIndex == null || newIndex === -1) {
              newIndex = oldIndex;
              newDraggableIndex = oldDraggableIndex;
            }

            _dispatchEvent({
              sortable: this,
              name: 'end',
              toEl: parentEl,
              originalEvent: evt
            }); // Save sorting


            this.save();
          }
        }
      }

      this._nulling();
    },
    _nulling: function _nulling() {
      pluginEvent('nulling', this);
      rootEl = dragEl = parentEl = ghostEl = nextEl = cloneEl = lastDownEl = cloneHidden = tapEvt = touchEvt = moved = newIndex = newDraggableIndex = oldIndex = oldDraggableIndex = lastTarget = lastDirection = putSortable = activeGroup = Sortable.dragged = Sortable.ghost = Sortable.clone = Sortable.active = null;
      savedInputChecked.forEach(function (el) {
        el.checked = true;
      });
      savedInputChecked.length = 0;
    },
    handleEvent: function handleEvent(
    /**Event*/
    evt) {
      switch (evt.type) {
        case 'drop':
        case 'dragend':
          this._onDrop(evt);

          break;

        case 'dragenter':
        case 'dragover':
          if (dragEl) {
            this._onDragOver(evt);

            _globalDragOver(evt);
          }

          break;

        case 'selectstart':
          evt.preventDefault();
          break;
      }
    },

    /**
     * Serializes the item into an array of string.
     * @returns {String[]}
     */
    toArray: function toArray() {
      var order = [],
          el,
          children = this.el.children,
          i = 0,
          n = children.length,
          options = this.options;

      for (; i < n; i++) {
        el = children[i];

        if (closest(el, options.draggable, this.el, false)) {
          order.push(el.getAttribute(options.dataIdAttr) || _generateId(el));
        }
      }

      return order;
    },

    /**
     * Sorts the elements according to the array.
     * @param  {String[]}  order  order of the items
     */
    sort: function sort(order) {
      var items = {},
          rootEl = this.el;
      this.toArray().forEach(function (id, i) {
        var el = rootEl.children[i];

        if (closest(el, this.options.draggable, rootEl, false)) {
          items[id] = el;
        }
      }, this);
      order.forEach(function (id) {
        if (items[id]) {
          rootEl.removeChild(items[id]);
          rootEl.appendChild(items[id]);
        }
      });
    },

    /**
     * Save the current sorting
     */
    save: function save() {
      var store = this.options.store;
      store && store.set && store.set(this);
    },

    /**
     * For each element in the set, get the first element that matches the selector by testing the element itself and traversing up through its ancestors in the DOM tree.
     * @param   {HTMLElement}  el
     * @param   {String}       [selector]  default: `options.draggable`
     * @returns {HTMLElement|null}
     */
    closest: function closest$1(el, selector) {
      return closest(el, selector || this.options.draggable, this.el, false);
    },

    /**
     * Set/get option
     * @param   {string} name
     * @param   {*}      [value]
     * @returns {*}
     */
    option: function option(name, value) {
      var options = this.options;

      if (value === void 0) {
        return options[name];
      } else {
        var modifiedValue = PluginManager.modifyOption(this, name, value);

        if (typeof modifiedValue !== 'undefined') {
          options[name] = modifiedValue;
        } else {
          options[name] = value;
        }

        if (name === 'group') {
          _prepareGroup(options);
        }
      }
    },

    /**
     * Destroy
     */
    destroy: function destroy() {
      pluginEvent('destroy', this);
      var el = this.el;
      el[expando] = null;
      off(el, 'mousedown', this._onTapStart);
      off(el, 'touchstart', this._onTapStart);
      off(el, 'pointerdown', this._onTapStart);

      if (this.nativeDraggable) {
        off(el, 'dragover', this);
        off(el, 'dragenter', this);
      } // Remove draggable attributes


      Array.prototype.forEach.call(el.querySelectorAll('[draggable]'), function (el) {
        el.removeAttribute('draggable');
      });

      this._onDrop();

      sortables.splice(sortables.indexOf(this.el), 1);
      this.el = el = null;
    },
    _hideClone: function _hideClone() {
      if (!cloneHidden) {
        pluginEvent('hideClone', this);
        if (Sortable.eventCanceled) return;
        css(cloneEl, 'display', 'none');

        if (this.options.removeCloneOnHide && cloneEl.parentNode) {
          cloneEl.parentNode.removeChild(cloneEl);
        }

        cloneHidden = true;
      }
    },
    _showClone: function _showClone(putSortable) {
      if (putSortable.lastPutMode !== 'clone') {
        this._hideClone();

        return;
      }

      if (cloneHidden) {
        pluginEvent('showClone', this);
        if (Sortable.eventCanceled) return; // show clone at dragEl or original position

        if (rootEl.contains(dragEl) && !this.options.group.revertClone) {
          rootEl.insertBefore(cloneEl, dragEl);
        } else if (nextEl) {
          rootEl.insertBefore(cloneEl, nextEl);
        } else {
          rootEl.appendChild(cloneEl);
        }

        if (this.options.group.revertClone) {
          this._animate(dragEl, cloneEl);
        }

        css(cloneEl, 'display', '');
        cloneHidden = false;
      }
    }
  };

  function _globalDragOver(
  /**Event*/
  evt) {
    if (evt.dataTransfer) {
      evt.dataTransfer.dropEffect = 'move';
    }

    evt.cancelable && evt.preventDefault();
  }

  function _onMove(fromEl, toEl, dragEl, dragRect, targetEl, targetRect, originalEvent, willInsertAfter) {
    var evt,
        sortable = fromEl[expando],
        onMoveFn = sortable.options.onMove,
        retVal; // Support for new CustomEvent feature

    if (window.CustomEvent && !IE11OrLess && !Edge) {
      evt = new CustomEvent('move', {
        bubbles: true,
        cancelable: true
      });
    } else {
      evt = document.createEvent('Event');
      evt.initEvent('move', true, true);
    }

    evt.to = toEl;
    evt.from = fromEl;
    evt.dragged = dragEl;
    evt.draggedRect = dragRect;
    evt.related = targetEl || toEl;
    evt.relatedRect = targetRect || getRect(toEl);
    evt.willInsertAfter = willInsertAfter;
    evt.originalEvent = originalEvent;
    fromEl.dispatchEvent(evt);

    if (onMoveFn) {
      retVal = onMoveFn.call(sortable, evt, originalEvent);
    }

    return retVal;
  }

  function _disableDraggable(el) {
    el.draggable = false;
  }

  function _unsilent() {
    _silent = false;
  }

  function _ghostIsLast(evt, vertical, sortable) {
    var rect = getRect(lastChild(sortable.el, sortable.options.draggable));
    var spacer = 10;
    return vertical ? evt.clientX > rect.right + spacer || evt.clientX <= rect.right && evt.clientY > rect.bottom && evt.clientX >= rect.left : evt.clientX > rect.right && evt.clientY > rect.top || evt.clientX <= rect.right && evt.clientY > rect.bottom + spacer;
  }

  function _getSwapDirection(evt, target, targetRect, vertical, swapThreshold, invertedSwapThreshold, invertSwap, isLastTarget) {
    var mouseOnAxis = vertical ? evt.clientY : evt.clientX,
        targetLength = vertical ? targetRect.height : targetRect.width,
        targetS1 = vertical ? targetRect.top : targetRect.left,
        targetS2 = vertical ? targetRect.bottom : targetRect.right,
        invert = false;

    if (!invertSwap) {
      // Never invert or create dragEl shadow when target movemenet causes mouse to move past the end of regular swapThreshold
      if (isLastTarget && targetMoveDistance < targetLength * swapThreshold) {
        // multiplied only by swapThreshold because mouse will already be inside target by (1 - threshold) * targetLength / 2
        // check if past first invert threshold on side opposite of lastDirection
        if (!pastFirstInvertThresh && (lastDirection === 1 ? mouseOnAxis > targetS1 + targetLength * invertedSwapThreshold / 2 : mouseOnAxis < targetS2 - targetLength * invertedSwapThreshold / 2)) {
          // past first invert threshold, do not restrict inverted threshold to dragEl shadow
          pastFirstInvertThresh = true;
        }

        if (!pastFirstInvertThresh) {
          // dragEl shadow (target move distance shadow)
          if (lastDirection === 1 ? mouseOnAxis < targetS1 + targetMoveDistance // over dragEl shadow
          : mouseOnAxis > targetS2 - targetMoveDistance) {
            return -lastDirection;
          }
        } else {
          invert = true;
        }
      } else {
        // Regular
        if (mouseOnAxis > targetS1 + targetLength * (1 - swapThreshold) / 2 && mouseOnAxis < targetS2 - targetLength * (1 - swapThreshold) / 2) {
          return _getInsertDirection(target);
        }
      }
    }

    invert = invert || invertSwap;

    if (invert) {
      // Invert of regular
      if (mouseOnAxis < targetS1 + targetLength * invertedSwapThreshold / 2 || mouseOnAxis > targetS2 - targetLength * invertedSwapThreshold / 2) {
        return mouseOnAxis > targetS1 + targetLength / 2 ? 1 : -1;
      }
    }

    return 0;
  }
  /**
   * Gets the direction dragEl must be swapped relative to target in order to make it
   * seem that dragEl has been "inserted" into that element's position
   * @param  {HTMLElement} target       The target whose position dragEl is being inserted at
   * @return {Number}                   Direction dragEl must be swapped
   */


  function _getInsertDirection(target) {
    if (index(dragEl) < index(target)) {
      return 1;
    } else {
      return -1;
    }
  }
  /**
   * Generate id
   * @param   {HTMLElement} el
   * @returns {String}
   * @private
   */


  function _generateId(el) {
    var str = el.tagName + el.className + el.src + el.href + el.textContent,
        i = str.length,
        sum = 0;

    while (i--) {
      sum += str.charCodeAt(i);
    }

    return sum.toString(36);
  }

  function _saveInputCheckedState(root) {
    savedInputChecked.length = 0;
    var inputs = root.getElementsByTagName('input');
    var idx = inputs.length;

    while (idx--) {
      var _el = inputs[idx];
      _el.checked && savedInputChecked.push(_el);
    }
  }

  function _nextTick(fn) {
    return setTimeout(fn, 0);
  }

  function _cancelNextTick(id) {
    return clearTimeout(id);
  } // Fixed #973:


  on(document, 'touchmove', function (evt) {
    if ((Sortable.active || awaitingDragStarted) && evt.cancelable) {
      evt.preventDefault();
    }
  }); // Export utils

  Sortable.utils = {
    on: on,
    off: off,
    css: css,
    find: find,
    is: function is(el, selector) {
      return !!closest(el, selector, el, false);
    },
    extend: extend,
    throttle: throttle,
    closest: closest,
    toggleClass: toggleClass,
    clone: clone,
    index: index,
    nextTick: _nextTick,
    cancelNextTick: _cancelNextTick,
    detectDirection: _detectDirection,
    getChild: getChild
  };
  /**
   * Mount a plugin to Sortable
   * @param  {...SortablePlugin|SortablePlugin[]} plugins       Plugins being mounted
   */

  Sortable.mount = function () {
    for (var _len = arguments.length, plugins = new Array(_len), _key = 0; _key < _len; _key++) {
      plugins[_key] = arguments[_key];
    }

    if (plugins[0].constructor === Array) plugins = plugins[0];
    plugins.forEach(function (plugin) {
      if (!plugin.prototype || !plugin.prototype.constructor) {
        throw "Sortable: Mounted plugin must be a constructor function, not ".concat({}.toString.call(el));
      }

      if (plugin.utils) Sortable.utils = _objectSpread({}, Sortable.utils, plugin.utils);
      PluginManager.mount(plugin);
    });
  };
  /**
   * Create sortable instance
   * @param {HTMLElement}  el
   * @param {Object}      [options]
   */


  Sortable.create = function (el, options) {
    return new Sortable(el, options);
  }; // Export


  Sortable.version = version;

  var autoScrolls = [],
      scrollEl,
      scrollRootEl,
      scrolling = false,
      lastAutoScrollX,
      lastAutoScrollY,
      touchEvt$1,
      pointerElemChangedInterval;

  function AutoScrollPlugin() {
    function AutoScroll() {
      this.options = {
        scroll: true,
        scrollSensitivity: 30,
        scrollSpeed: 10,
        bubbleScroll: true
      }; // Bind all private methods

      for (var fn in this) {
        if (fn.charAt(0) === '_' && typeof this[fn] === 'function') {
          this[fn] = this[fn].bind(this);
        }
      }
    }

    AutoScroll.prototype = {
      dragStarted: function dragStarted(_ref) {
        var originalEvent = _ref.originalEvent;

        if (this.sortable.nativeDraggable) {
          on(document, 'dragover', this._handleAutoScroll);
        } else {
          if (this.sortable.options.supportPointer) {
            on(document, 'pointermove', this._handleFallbackAutoScroll);
          } else if (originalEvent.touches) {
            on(document, 'touchmove', this._handleFallbackAutoScroll);
          } else {
            on(document, 'mousemove', this._handleFallbackAutoScroll);
          }
        }
      },
      dragOverCompleted: function dragOverCompleted(_ref2) {
        var originalEvent = _ref2.originalEvent;

        // For when bubbling is canceled and using fallback (fallback 'touchmove' always reached)
        if (!this.sortable.options.dragOverBubble && !originalEvent.rootEl) {
          this._handleAutoScroll(originalEvent);
        }
      },
      drop: function drop() {
        if (this.sortable.nativeDraggable) {
          off(document, 'dragover', this._handleAutoScroll);
        } else {
          off(document, 'pointermove', this._handleFallbackAutoScroll);
          off(document, 'touchmove', this._handleFallbackAutoScroll);
          off(document, 'mousemove', this._handleFallbackAutoScroll);
        }

        clearPointerElemChangedInterval();
        clearAutoScrolls();
        cancelThrottle();
      },
      nulling: function nulling() {
        touchEvt$1 = scrollRootEl = scrollEl = scrolling = pointerElemChangedInterval = lastAutoScrollX = lastAutoScrollY = null;
        autoScrolls.length = 0;
      },
      _handleFallbackAutoScroll: function _handleFallbackAutoScroll(evt) {
        this._handleAutoScroll(evt, true);
      },
      _handleAutoScroll: function _handleAutoScroll(evt, fallback) {
        var _this = this;

        var x = evt.clientX,
            y = evt.clientY,
            elem = document.elementFromPoint(x, y);
        touchEvt$1 = evt; // IE does not seem to have native autoscroll,
        // Edge's autoscroll seems too conditional,
        // MACOS Safari does not have autoscroll,
        // Firefox and Chrome are good

        if (fallback || Edge || IE11OrLess || Safari) {
          autoScroll(evt, this.options, elem, fallback); // Listener for pointer element change

          var ogElemScroller = getParentAutoScrollElement(elem, true);

          if (scrolling && (!pointerElemChangedInterval || x !== lastAutoScrollX || y !== lastAutoScrollY)) {
            pointerElemChangedInterval && clearPointerElemChangedInterval(); // Detect for pointer elem change, emulating native DnD behaviour

            pointerElemChangedInterval = setInterval(function () {
              var newElem = getParentAutoScrollElement(document.elementFromPoint(x, y), true);

              if (newElem !== ogElemScroller) {
                ogElemScroller = newElem;
                clearAutoScrolls();
              }

              autoScroll(evt, _this.options, newElem, fallback);
            }, 10);
            lastAutoScrollX = x;
            lastAutoScrollY = y;
          }
        } else {
          // if DnD is enabled (and browser has good autoscrolling), first autoscroll will already scroll, so get parent autoscroll of first autoscroll
          if (!this.sortable.options.bubbleScroll || getParentAutoScrollElement(elem, true) === getWindowScrollingElement()) {
            clearAutoScrolls();
            return;
          }

          autoScroll(evt, this.options, getParentAutoScrollElement(elem, false), false);
        }
      }
    };
    return _extends(AutoScroll, {
      pluginName: 'scroll',
      initializeByDefault: true
    });
  }

  function clearAutoScrolls() {
    autoScrolls.forEach(function (autoScroll) {
      clearInterval(autoScroll.pid);
    });
    autoScrolls = [];
  }

  function clearPointerElemChangedInterval() {
    clearInterval(pointerElemChangedInterval);
  }

  var autoScroll = throttle(function (evt, options, rootEl, isFallback) {
    // Bug: https://bugzilla.mozilla.org/show_bug.cgi?id=505521
    if (!options.scroll) return;
    var sens = options.scrollSensitivity,
        speed = options.scrollSpeed,
        winScroller = getWindowScrollingElement();
    var scrollThisInstance = false,
        scrollCustomFn; // New scroll root, set scrollEl

    if (scrollRootEl !== rootEl) {
      scrollRootEl = rootEl;
      clearAutoScrolls();
      scrollEl = options.scroll;
      scrollCustomFn = options.scrollFn;

      if (scrollEl === true) {
        scrollEl = getParentAutoScrollElement(rootEl, true);
      }
    }

    var layersOut = 0;
    var currentParent = scrollEl;

    do {
      var el = currentParent,
          rect = getRect(el),
          top = rect.top,
          bottom = rect.bottom,
          left = rect.left,
          right = rect.right,
          width = rect.width,
          height = rect.height,
          canScrollX = void 0,
          canScrollY = void 0,
          scrollWidth = el.scrollWidth,
          scrollHeight = el.scrollHeight,
          elCSS = css(el),
          scrollPosX = el.scrollLeft,
          scrollPosY = el.scrollTop;

      if (el === winScroller) {
        canScrollX = width < scrollWidth && (elCSS.overflowX === 'auto' || elCSS.overflowX === 'scroll' || elCSS.overflowX === 'visible');
        canScrollY = height < scrollHeight && (elCSS.overflowY === 'auto' || elCSS.overflowY === 'scroll' || elCSS.overflowY === 'visible');
      } else {
        canScrollX = width < scrollWidth && (elCSS.overflowX === 'auto' || elCSS.overflowX === 'scroll');
        canScrollY = height < scrollHeight && (elCSS.overflowY === 'auto' || elCSS.overflowY === 'scroll');
      }

      var vx = canScrollX && (Math.abs(right - evt.clientX) <= sens && scrollPosX + width < scrollWidth) - (Math.abs(left - evt.clientX) <= sens && !!scrollPosX);
      var vy = canScrollY && (Math.abs(bottom - evt.clientY) <= sens && scrollPosY + height < scrollHeight) - (Math.abs(top - evt.clientY) <= sens && !!scrollPosY);

      if (!autoScrolls[layersOut]) {
        for (var i = 0; i <= layersOut; i++) {
          if (!autoScrolls[i]) {
            autoScrolls[i] = {};
          }
        }
      }

      if (autoScrolls[layersOut].vx != vx || autoScrolls[layersOut].vy != vy || autoScrolls[layersOut].el !== el) {
        autoScrolls[layersOut].el = el;
        autoScrolls[layersOut].vx = vx;
        autoScrolls[layersOut].vy = vy;
        clearInterval(autoScrolls[layersOut].pid);

        if (vx != 0 || vy != 0) {
          scrollThisInstance = true;
          /* jshint loopfunc:true */

          autoScrolls[layersOut].pid = setInterval(function () {
            // emulate drag over during autoscroll (fallback), emulating native DnD behaviour
            if (isFallback && this.layer === 0) {
              Sortable.active._onTouchMove(touchEvt$1); // To move ghost if it is positioned absolutely

            }

            var scrollOffsetY = autoScrolls[this.layer].vy ? autoScrolls[this.layer].vy * speed : 0;
            var scrollOffsetX = autoScrolls[this.layer].vx ? autoScrolls[this.layer].vx * speed : 0;

            if (typeof scrollCustomFn === 'function') {
              if (scrollCustomFn.call(Sortable.dragged.parentNode[expando], scrollOffsetX, scrollOffsetY, evt, touchEvt$1, autoScrolls[this.layer].el) !== 'continue') {
                return;
              }
            }

            scrollBy(autoScrolls[this.layer].el, scrollOffsetX, scrollOffsetY);
          }.bind({
            layer: layersOut
          }), 24);
        }
      }

      layersOut++;
    } while (options.bubbleScroll && currentParent !== winScroller && (currentParent = getParentAutoScrollElement(currentParent, false)));

    scrolling = scrollThisInstance; // in case another function catches scrolling as false in between when it is not
  }, 30);

  var drop = function drop(_ref) {
    var originalEvent = _ref.originalEvent,
        putSortable = _ref.putSortable,
        dragEl = _ref.dragEl,
        activeSortable = _ref.activeSortable,
        dispatchSortableEvent = _ref.dispatchSortableEvent,
        hideGhostForTarget = _ref.hideGhostForTarget,
        unhideGhostForTarget = _ref.unhideGhostForTarget;
    var toSortable = putSortable || activeSortable;
    hideGhostForTarget();
    var target = document.elementFromPoint(originalEvent.clientX, originalEvent.clientY);
    unhideGhostForTarget();

    if (toSortable && !toSortable.el.contains(target)) {
      dispatchSortableEvent('spill');
      this.onSpill(dragEl);
    }
  };

  function Revert() {}

  Revert.prototype = {
    startIndex: null,
    dragStart: function dragStart(_ref2) {
      var oldDraggableIndex = _ref2.oldDraggableIndex;
      this.startIndex = oldDraggableIndex;
    },
    onSpill: function onSpill(dragEl) {
      this.sortable.captureAnimationState();
      var nextSibling = getChild(this.sortable.el, this.startIndex, this.sortable.options);

      if (nextSibling) {
        this.sortable.el.insertBefore(dragEl, nextSibling);
      } else {
        this.sortable.el.appendChild(dragEl);
      }

      this.sortable.animateAll();
    },
    drop: drop
  };

  _extends(Revert, {
    pluginName: 'revertOnSpill'
  });

  function Remove() {}

  Remove.prototype = {
    onSpill: function onSpill(dragEl) {
      this.sortable.captureAnimationState();
      dragEl.parentNode && dragEl.parentNode.removeChild(dragEl);
      this.sortable.animateAll();
    },
    drop: drop
  };

  _extends(Remove, {
    pluginName: 'removeOnSpill'
  });

  var lastSwapEl;

  function SwapPlugin() {
    function Swap() {
      this.options = {
        swapClass: 'sortable-swap-highlight'
      };
    }

    Swap.prototype = {
      dragStart: function dragStart(_ref) {
        var dragEl = _ref.dragEl;
        lastSwapEl = dragEl;
      },
      dragOverValid: function dragOverValid(_ref2) {
        var completed = _ref2.completed,
            target = _ref2.target,
            onMove = _ref2.onMove,
            activeSortable = _ref2.activeSortable,
            changed = _ref2.changed;
        if (!activeSortable.options.swap) return;
        var el = this.sortable.el,
            options = this.sortable.options;

        if (target && target !== el) {
          var prevSwapEl = lastSwapEl;

          if (onMove(target) !== false) {
            toggleClass(target, options.swapClass, true);
            lastSwapEl = target;
          } else {
            lastSwapEl = null;
          }

          if (prevSwapEl && prevSwapEl !== lastSwapEl) {
            toggleClass(prevSwapEl, options.swapClass, false);
          }
        }

        changed();
        return completed(true);
      },
      drop: function drop(_ref3) {
        var activeSortable = _ref3.activeSortable,
            putSortable = _ref3.putSortable,
            dragEl = _ref3.dragEl;
        var toSortable = putSortable || this.sortable;
        var options = this.sortable.options;
        lastSwapEl && toggleClass(lastSwapEl, options.swapClass, false);

        if (lastSwapEl && (options.swap || putSortable && putSortable.options.swap)) {
          if (dragEl !== lastSwapEl) {
            toSortable.captureAnimationState();
            if (toSortable !== activeSortable) activeSortable.captureAnimationState();
            swapNodes(dragEl, lastSwapEl);
            toSortable.animateAll();
            if (toSortable !== activeSortable) activeSortable.animateAll();
          }
        }
      },
      nulling: function nulling() {
        lastSwapEl = null;
      }
    };
    return _extends(Swap, {
      pluginName: 'swap',
      eventOptions: function eventOptions() {
        return {
          swapItem: lastSwapEl
        };
      }
    });
  }

  function swapNodes(n1, n2) {
    var p1 = n1.parentNode,
        p2 = n2.parentNode,
        i1,
        i2;
    if (!p1 || !p2 || p1.isEqualNode(n2) || p2.isEqualNode(n1)) return;
    i1 = index(n1);
    i2 = index(n2);

    if (p1.isEqualNode(p2) && i1 < i2) {
      i2++;
    }

    p1.insertBefore(n2, p1.children[i1]);
    p2.insertBefore(n1, p2.children[i2]);
  }

  var multiDragElements = [],
      multiDragClones = [],
      lastMultiDragSelect,
      // for selection with modifier key down (SHIFT)
  multiDragSortable,
      initialFolding = false,
      // Initial multi-drag fold when drag started
  folding = false,
      // Folding any other time
  dragStarted = false,
      dragEl$1,
      clonesFromRect,
      clonesHidden;

  function MultiDragPlugin() {
    function MultiDrag(sortable) {
      // Bind all private methods
      for (var fn in this) {
        if (fn.charAt(0) === '_' && typeof this[fn] === 'function') {
          this[fn] = this[fn].bind(this);
        }
      }

      if (sortable.options.supportPointer) {
        on(document, 'pointerup', this._deselectMultiDrag);
      } else {
        on(document, 'mouseup', this._deselectMultiDrag);
        on(document, 'touchend', this._deselectMultiDrag);
      }

      on(document, 'keydown', this._checkKeyDown);
      on(document, 'keyup', this._checkKeyUp);
      this.options = {
        selectedClass: 'sortable-selected',
        multiDragKey: null,
        setData: function setData(dataTransfer, dragEl) {
          var data = '';

          if (multiDragElements.length && multiDragSortable === sortable) {
            multiDragElements.forEach(function (multiDragElement, i) {
              data += (!i ? '' : ', ') + multiDragElement.textContent;
            });
          } else {
            data = dragEl.textContent;
          }

          dataTransfer.setData('Text', data);
        }
      };
    }

    MultiDrag.prototype = {
      multiDragKeyDown: false,
      isMultiDrag: false,
      delayStartGlobal: function delayStartGlobal(_ref) {
        var dragged = _ref.dragEl;
        dragEl$1 = dragged;
      },
      delayEnded: function delayEnded() {
        this.isMultiDrag = ~multiDragElements.indexOf(dragEl$1);
      },
      setupClone: function setupClone(_ref2) {
        var sortable = _ref2.sortable;
        if (!this.isMultiDrag) return;

        for (var _i = 0; _i < multiDragElements.length; _i++) {
          multiDragClones.push(clone(multiDragElements[_i]));
          multiDragClones[_i].sortableIndex = multiDragElements[_i].sortableIndex;
          multiDragClones[_i].draggable = false;
          multiDragClones[_i].style['will-change'] = '';
          toggleClass(multiDragClones[_i], sortable.options.selectedClass, false);
          multiDragElements[_i] === dragEl$1 && toggleClass(multiDragClones[_i], sortable.options.chosenClass, false);
        }

        sortable._hideClone();

        return true;
      },
      clone: function clone(_ref3) {
        var sortable = _ref3.sortable,
            rootEl = _ref3.rootEl,
            dispatchSortableEvent = _ref3.dispatchSortableEvent;
        if (!this.isMultiDrag) return;

        if (!sortable.options.removeCloneOnHide) {
          if (multiDragElements.length && multiDragSortable === sortable) {
            insertMultiDragClones(true, rootEl);
            dispatchSortableEvent('clone');
            return true;
          }
        }
      },
      showClone: function showClone(_ref4) {
        var cloneNowShown = _ref4.cloneNowShown,
            rootEl = _ref4.rootEl;
        if (!this.isMultiDrag) return;
        insertMultiDragClones(false, rootEl);
        multiDragClones.forEach(function (clone) {
          css(clone, 'display', '');
        });
        cloneNowShown();
        clonesHidden = false;
        return true;
      },
      hideClone: function hideClone(_ref5) {
        var sortable = _ref5.sortable,
            cloneNowHidden = _ref5.cloneNowHidden;
        if (!this.isMultiDrag) return;
        multiDragClones.forEach(function (clone) {
          css(clone, 'display', 'none');

          if (sortable.options.removeCloneOnHide && clone.parentNode) {
            clone.parentNode.removeChild(clone);
          }
        });
        cloneNowHidden();
        clonesHidden = true;
        return true;
      },
      dragStartGlobal: function dragStartGlobal(_ref6) {
        var sortable = _ref6.sortable;

        if (!this.isMultiDrag && multiDragSortable) {
          multiDragSortable.multiDrag._deselectMultiDrag();
        }

        multiDragElements.forEach(function (multiDragElement) {
          multiDragElement.sortableIndex = index(multiDragElement);
        }); // Sort multi-drag elements

        multiDragElements = multiDragElements.sort(function (a, b) {
          return a.sortableIndex - b.sortableIndex;
        });
        dragStarted = true;
      },
      dragStarted: function dragStarted(_ref7) {
        var sortable = _ref7.sortable;
        if (!this.isMultiDrag) return;

        if (sortable.options.sort) {
          // Capture rects,
          // hide multi drag elements (by positioning them absolute),
          // set multi drag elements rects to dragRect,
          // show multi drag elements,
          // animate to rects,
          // unset rects & remove from DOM
          sortable.captureAnimationState();

          if (sortable.options.animation) {
            multiDragElements.forEach(function (multiDragElement) {
              if (multiDragElement === dragEl$1) return;
              css(multiDragElement, 'position', 'absolute');
            });
            var dragRect = getRect(dragEl$1, false, true, true);
            multiDragElements.forEach(function (multiDragElement) {
              if (multiDragElement === dragEl$1) return;
              setRect(multiDragElement, dragRect);
            });
            folding = true;
            initialFolding = true;
          }
        }

        sortable.animateAll(function () {
          folding = false;
          initialFolding = false;

          if (sortable.options.animation) {
            multiDragElements.forEach(function (multiDragElement) {
              unsetRect(multiDragElement);
            });
          } // Remove all auxiliary multidrag items from el, if sorting enabled


          if (sortable.options.sort) {
            removeMultiDragElements();
          }
        });
      },
      dragOver: function dragOver(_ref8) {
        var target = _ref8.target,
            completed = _ref8.completed;

        if (folding && ~multiDragElements.indexOf(target)) {
          return completed(false);
        }
      },
      revert: function revert(_ref9) {
        var fromSortable = _ref9.fromSortable,
            rootEl = _ref9.rootEl,
            sortable = _ref9.sortable,
            dragRect = _ref9.dragRect;

        if (multiDragElements.length > 1) {
          // Setup unfold animation
          multiDragElements.forEach(function (multiDragElement) {
            sortable.addAnimationState({
              target: multiDragElement,
              rect: folding ? getRect(multiDragElement) : dragRect
            });
            unsetRect(multiDragElement);
            multiDragElement.fromRect = dragRect;
            fromSortable.removeAnimationState(multiDragElement);
          });
          folding = false;
          insertMultiDragElements(!sortable.options.removeCloneOnHide, rootEl);
        }
      },
      dragOverCompleted: function dragOverCompleted(_ref10) {
        var sortable = _ref10.sortable,
            isOwner = _ref10.isOwner,
            insertion = _ref10.insertion,
            activeSortable = _ref10.activeSortable,
            parentEl = _ref10.parentEl,
            putSortable = _ref10.putSortable;
        var options = sortable.options;

        if (insertion) {
          // Clones must be hidden before folding animation to capture dragRectAbsolute properly
          if (isOwner) {
            activeSortable._hideClone();
          }

          initialFolding = false; // If leaving sort:false root, or already folding - Fold to new location

          if (options.animation && multiDragElements.length > 1 && (folding || !isOwner && !activeSortable.options.sort && !putSortable)) {
            // Fold: Set all multi drag elements's rects to dragEl's rect when multi-drag elements are invisible
            var dragRectAbsolute = getRect(dragEl$1, false, true, true);
            multiDragElements.forEach(function (multiDragElement) {
              if (multiDragElement === dragEl$1) return;
              setRect(multiDragElement, dragRectAbsolute); // Move element(s) to end of parentEl so that it does not interfere with multi-drag clones insertion if they are inserted
              // while folding, and so that we can capture them again because old sortable will no longer be fromSortable

              parentEl.appendChild(multiDragElement);
            });
            folding = true;
          } // Clones must be shown (and check to remove multi drags) after folding when interfering multiDragElements are moved out


          if (!isOwner) {
            // Only remove if not folding (folding will remove them anyways)
            if (!folding) {
              removeMultiDragElements();
            }

            if (multiDragElements.length > 1) {
              var clonesHiddenBefore = clonesHidden;

              activeSortable._showClone(sortable); // Unfold animation for clones if showing from hidden


              if (activeSortable.options.animation && !clonesHidden && clonesHiddenBefore) {
                multiDragClones.forEach(function (clone) {
                  activeSortable.addAnimationState({
                    target: clone,
                    rect: clonesFromRect
                  });
                  clone.fromRect = clonesFromRect;
                  clone.thisAnimationDuration = null;
                });
              }
            } else {
              activeSortable._showClone(sortable);
            }
          }
        }
      },
      dragOverAnimationCapture: function dragOverAnimationCapture(_ref11) {
        var dragRect = _ref11.dragRect,
            isOwner = _ref11.isOwner,
            activeSortable = _ref11.activeSortable;
        multiDragElements.forEach(function (multiDragElement) {
          multiDragElement.thisAnimationDuration = null;
        });

        if (activeSortable.options.animation && !isOwner && activeSortable.multiDrag.isMultiDrag) {
          clonesFromRect = _extends({}, dragRect);
          var dragMatrix = matrix(dragEl$1, true);
          clonesFromRect.top -= dragMatrix.f;
          clonesFromRect.left -= dragMatrix.e;
        }
      },
      dragOverAnimationComplete: function dragOverAnimationComplete() {
        if (folding) {
          folding = false;
          removeMultiDragElements();
        }
      },
      drop: function drop(_ref12) {
        var evt = _ref12.originalEvent,
            rootEl = _ref12.rootEl,
            parentEl = _ref12.parentEl,
            sortable = _ref12.sortable,
            dispatchSortableEvent = _ref12.dispatchSortableEvent,
            oldIndex = _ref12.oldIndex,
            putSortable = _ref12.putSortable;
        var toSortable = putSortable || this.sortable;
        if (!evt) return;
        var options = sortable.options,
            children = parentEl.children; // Multi-drag selection

        if (!dragStarted) {
          if (options.multiDragKey && !this.multiDragKeyDown) {
            this._deselectMultiDrag();
          }

          toggleClass(dragEl$1, options.selectedClass, !~multiDragElements.indexOf(dragEl$1));

          if (!~multiDragElements.indexOf(dragEl$1)) {
            multiDragElements.push(dragEl$1);
            dispatchEvent({
              sortable: sortable,
              rootEl: rootEl,
              name: 'select',
              targetEl: dragEl$1,
              originalEvt: evt
            }); // Modifier activated, select from last to dragEl

            if ((!options.multiDragKey || this.multiDragKeyDown) && evt.shiftKey && lastMultiDragSelect && sortable.el.contains(lastMultiDragSelect)) {
              var lastIndex = index(lastMultiDragSelect),
                  currentIndex = index(dragEl$1);

              if (~lastIndex && ~currentIndex && lastIndex !== currentIndex) {
                // Must include lastMultiDragSelect (select it), in case modified selection from no selection
                // (but previous selection existed)
                var n, _i2;

                if (currentIndex > lastIndex) {
                  _i2 = lastIndex;
                  n = currentIndex;
                } else {
                  _i2 = currentIndex;
                  n = lastIndex + 1;
                }

                for (; _i2 < n; _i2++) {
                  if (~multiDragElements.indexOf(children[_i2])) continue;
                  toggleClass(children[_i2], options.selectedClass, true);
                  multiDragElements.push(children[_i2]);
                  dispatchEvent({
                    sortable: sortable,
                    rootEl: rootEl,
                    name: 'select',
                    targetEl: children[_i2],
                    originalEvt: evt
                  });
                }
              }
            } else {
              lastMultiDragSelect = dragEl$1;
            }

            multiDragSortable = toSortable;
          } else {
            multiDragElements.splice(multiDragElements.indexOf(dragEl$1), 1);
            lastMultiDragSelect = null;
            dispatchEvent({
              sortable: sortable,
              rootEl: rootEl,
              name: 'deselect',
              targetEl: dragEl$1,
              originalEvt: evt
            });
          }
        } // Multi-drag drop


        if (dragStarted && this.isMultiDrag) {
          // Do not "unfold" after around dragEl if reverted
          if ((parentEl[expando].options.sort || parentEl !== rootEl) && multiDragElements.length > 1) {
            var dragRect = getRect(dragEl$1),
                multiDragIndex = index(dragEl$1, ':not(.' + this.options.selectedClass + ')');
            if (!initialFolding && options.animation) dragEl$1.thisAnimationDuration = null;
            toSortable.captureAnimationState();

            if (!initialFolding) {
              if (options.animation) {
                dragEl$1.fromRect = dragRect;
                multiDragElements.forEach(function (multiDragElement) {
                  multiDragElement.thisAnimationDuration = null;

                  if (multiDragElement !== dragEl$1) {
                    var rect = folding ? getRect(multiDragElement) : dragRect;
                    multiDragElement.fromRect = rect; // Prepare unfold animation

                    toSortable.addAnimationState({
                      target: multiDragElement,
                      rect: rect
                    });
                  }
                });
              } // Multi drag elements are not necessarily removed from the DOM on drop, so to reinsert
              // properly they must all be removed


              removeMultiDragElements();
              multiDragElements.forEach(function (multiDragElement) {
                if (children[multiDragIndex]) {
                  parentEl.insertBefore(multiDragElement, children[multiDragIndex]);
                } else {
                  parentEl.appendChild(multiDragElement);
                }

                multiDragIndex++;
              }); // If initial folding is done, the elements may have changed position because they are now
              // unfolding around dragEl, even though dragEl may not have his index changed, so update event
              // must be fired here as Sortable will not.

              if (oldIndex === index(dragEl$1)) {
                var update = false;
                multiDragElements.forEach(function (multiDragElement) {
                  if (multiDragElement.sortableIndex !== index(multiDragElement)) {
                    update = true;
                    return;
                  }
                });

                if (update) {
                  dispatchSortableEvent('update');
                }
              }
            } // Must be done after capturing individual rects (scroll bar)


            multiDragElements.forEach(function (multiDragElement) {
              unsetRect(multiDragElement);
            });
            toSortable.animateAll();
          }

          multiDragSortable = toSortable;
        } // Remove clones if necessary


        if (rootEl === parentEl || putSortable && putSortable.lastPutMode !== 'clone') {
          multiDragClones.forEach(function (clone) {
            clone.parentNode && clone.parentNode.removeChild(clone);
          });
        }
      },
      nullingGlobal: function nullingGlobal() {
        this.isMultiDrag = dragStarted = false;
        multiDragClones.length = 0;
      },
      destroy: function destroy() {
        this._deselectMultiDrag();

        off(document, 'pointerup', this._deselectMultiDrag);
        off(document, 'mouseup', this._deselectMultiDrag);
        off(document, 'touchend', this._deselectMultiDrag);
        off(document, 'keydown', this._checkKeyDown);
        off(document, 'keyup', this._checkKeyUp);
      },
      _deselectMultiDrag: function _deselectMultiDrag(evt) {
        if (dragStarted) return; // Only deselect if selection is in this sortable

        if (multiDragSortable !== this.sortable) return; // Only deselect if target is not item in this sortable

        if (evt && closest(evt.target, this.sortable.options.draggable, this.sortable.el, false)) return; // Only deselect if left click

        if (evt && evt.button !== 0) return;

        while (multiDragElements.length) {
          var el = multiDragElements[0];
          toggleClass(el, this.sortable.options.selectedClass, false);
          multiDragElements.shift();
          dispatchEvent({
            sortable: this.sortable,
            rootEl: this.sortable.el,
            name: 'deselect',
            targetEl: el,
            originalEvt: evt
          });
        }
      },
      _checkKeyDown: function _checkKeyDown(evt) {
        if (evt.key === this.sortable.options.multiDragKey) {
          this.multiDragKeyDown = true;
        }
      },
      _checkKeyUp: function _checkKeyUp(evt) {
        if (evt.key === this.sortable.options.multiDragKey) {
          this.multiDragKeyDown = false;
        }
      }
    };
    return _extends(MultiDrag, {
      // Static methods & properties
      pluginName: 'multiDrag',
      utils: {
        /**
         * Selects the provided multi-drag item
         * @param  {HTMLElement} el    The element to be selected
         */
        select: function select(el) {
          var sortable = el.parentNode[expando];
          if (!sortable || !sortable.options.multiDrag || ~multiDragElements.indexOf(el)) return;

          if (multiDragSortable && multiDragSortable !== sortable) {
            multiDragSortable.multiDrag._deselectMultiDrag();

            multiDragSortable = sortable;
          }

          toggleClass(el, sortable.options.selectedClass, true);
          multiDragElements.push(el);
        },

        /**
         * Deselects the provided multi-drag item
         * @param  {HTMLElement} el    The element to be deselected
         */
        deselect: function deselect(el) {
          var sortable = el.parentNode[expando],
              index = multiDragElements.indexOf(el);
          if (!sortable || !sortable.options.multiDrag || !~index) return;
          toggleClass(el, sortable.options.selectedClass, false);
          multiDragElements.splice(index, 1);
        }
      },
      eventOptions: function eventOptions() {
        var _this = this;

        var oldIndicies = [],
            newIndicies = [];
        multiDragElements.forEach(function (multiDragElement) {
          oldIndicies.push({
            multiDragElement: multiDragElement,
            index: multiDragElement.sortableIndex
          }); // multiDragElements will already be sorted if folding

          var newIndex;

          if (folding && multiDragElement !== dragEl$1) {
            newIndex = -1;
          } else if (folding) {
            newIndex = index(multiDragElement, ':not(.' + _this.options.selectedClass + ')');
          } else {
            newIndex = index(multiDragElement);
          }

          newIndicies.push({
            multiDragElement: multiDragElement,
            index: newIndex
          });
        });
        return {
          items: _toConsumableArray(multiDragElements),
          clones: [].concat(multiDragClones),
          oldIndicies: oldIndicies,
          newIndicies: newIndicies
        };
      },
      optionListeners: {
        multiDragKey: function multiDragKey(key) {
          key = key.toLowerCase();

          if (key === 'ctrl') {
            key = 'Control';
          } else if (key.length > 1) {
            key = key.charAt(0).toUpperCase() + key.substr(1);
          }

          return key;
        }
      }
    });
  }

  function insertMultiDragElements(clonesInserted, rootEl) {
    multiDragElements.forEach(function (multiDragElement) {
      var target = rootEl.children[multiDragElement.sortableIndex + (clonesInserted ? Number(i) : 0)];

      if (target) {
        rootEl.insertBefore(multiDragElement, target);
      } else {
        rootEl.appendChild(multiDragElement);
      }
    });
  }
  /**
   * Insert multi-drag clones
   * @param  {[Boolean]} elementsInserted  Whether the multi-drag elements are inserted
   * @param  {HTMLElement} rootEl
   */


  function insertMultiDragClones(elementsInserted, rootEl) {
    multiDragClones.forEach(function (clone) {
      var target = rootEl.children[clone.sortableIndex + (elementsInserted ? Number(i) : 0)];

      if (target) {
        rootEl.insertBefore(clone, target);
      } else {
        rootEl.appendChild(clone);
      }
    });
  }

  function removeMultiDragElements() {
    multiDragElements.forEach(function (multiDragElement) {
      if (multiDragElement === dragEl$1) return;
      multiDragElement.parentNode && multiDragElement.parentNode.removeChild(multiDragElement);
    });
  }

  Sortable.mount(new AutoScrollPlugin());
  Sortable.mount(Remove, Revert);

  Sortable.mount(new SwapPlugin());
  Sortable.mount(new MultiDragPlugin());

  return Sortable;

}));

var DataTable=function(t,e){"use strict";function n(t,e){return"string"==typeof t?(e||document).querySelector(t):t||null}function i(t){var e=typeof t;return null!=t&&("object"==e||"function"==e)}function o(t){var e=T.call(t,L),n=t[L];try{t[L]=void 0;var i=!0}catch(t){}var o=H.call(t);return i&&(e?t[L]=n:delete t[L]),o}function s(t){return W.call(t)}function r(t){return null==t?void 0===t?z:O:A&&A in Object(t)?_(t):j(t)}function a(t){return null!=t&&"object"==typeof t}function l(t){return"symbol"==typeof t||F(t)&&B(t)==D}function c(t){if("number"==typeof t)return t;if(N(t))return V;if(I(t)){var e="function"==typeof t.valueOf?t.valueOf():t;t=I(e)?e+"":e}if("string"!=typeof t)return 0===t?t:+t;t=t.replace(q,"");var n=P.test(t);return n||X.test(t)?U(t.slice(2),n?2:8):K.test(t)?V:+t}function h(t,e,n){function i(e){var n=d,i=f;return d=f=void 0,b=e,g=t.apply(i,n)}function o(t){return b=t,p=setTimeout(a,e),C?i(t):g}function s(t){var n=t-b,i=e-(t-w);return y?Q(i,m-n):i}function r(t){var n=t-w,i=t-b;return void 0===w||n>=e||n<0||y&&i>=m}function a(){var t=E();if(r(t))return l(t);p=setTimeout(a,s(t))}function l(t){return p=void 0,x&&d?i(t):(d=f=void 0,g)}function c(){void 0!==p&&clearTimeout(p),b=0,d=w=f=p=void 0}function h(){return void 0===p?g:l(E())}function u(){var t=E(),n=r(t);if(d=arguments,f=this,w=t,n){if(void 0===p)return o(w);if(y)return p=setTimeout(a,e),i(w)}return void 0===p&&(p=setTimeout(a,e)),g}var d,f,m,g,p,w,b=0,C=!1,y=!1,x=!0;if("function"!=typeof t)throw new TypeError(G);return e=Z(e)||0,I(n)&&(C=!!n.leading,m=(y="maxWait"in n)?J(Z(n.maxWait)||0,e):m,x="trailing"in n?!!n.trailing:x),u.cancel=c,u.flush=h,u}function u(t,e,n){var i=!0,o=!0;if("function"!=typeof t)throw new TypeError(tt);return I(n)&&(i="leading"in n?!!n.leading:i,o="trailing"in n?!!n.trailing:o),Y(t,e,{leading:i,maxWait:e,trailing:o})}function d(t){return t.replace(/([A-Z])/g,t=>`-${t[0].toLowerCase()}`)}function f(t){return Object.keys(t).map(e=>{const n=d(e);const i=t[e];if(void 0===i)return"";return`data-${n}="${i}" `}).join("").trim()}function m(t){var e=document.createElement("textarea");e.style.position="fixed",e.style.top=0,e.style.left=0,e.style.width="2em",e.style.height="2em",e.style.padding=0,e.style.border="none",e.style.outline="none",e.style.boxShadow="none",e.style.background="transparent",e.value=t,document.body.appendChild(e),e.select();try{document.execCommand("copy")}catch(t){console.log("Oops, unable to copy")}document.body.removeChild(e)}function g(t){return!isNaN(t)}function p(t,e=null){return(...n)=>new Promise(i=>{const o=()=>{const o=t.apply(e,n);i(o)};window.setImmediate?setImmediate(o):window.requestAnimationFrame?requestAnimationFrame(o):setTimeout(o)})}function w(t,e,n){const i=n.reduce((t,n)=>{t[n]={get(){return e[n]}};return t},{});Object.defineProperties(t,i)}function b(t){return void 0!==t||null!==t}function C(t){return!b(t)}function y(t){return!isNaN(t)}function x(t){return Array.isArray(t)?t:[t]}t=t&&t.hasOwnProperty("default")?t.default:t,e=e&&e.hasOwnProperty("default")?e.default:e,n.each=((t,e)=>"string"==typeof t?Array.from((e||document).querySelectorAll(t)):t||null),n.create=((t,e)=>{let i=document.createElement(t);for(let t in e){let o=e[t];if("inside"===t)n(o).appendChild(i);else if("around"===t){let t=n(o);t.parentNode.insertBefore(i,t),i.appendChild(t)}else"styles"===t?"object"==typeof o&&Object.keys(o).map(t=>{i.style[t]=o[t]}):t in i?i[t]=o:i.setAttribute(t,o)}return i}),n.on=((t,e,i,o)=>{o?n.delegate(t,e,i,o):(o=i,n.bind(t,e,o))}),n.off=((t,e,n)=>{t.removeEventListener(e,n)}),n.bind=((t,e,n)=>{e.split(/\s+/).forEach(function(e){t.addEventListener(e,n)})}),n.delegate=((t,e,n,i)=>{t.addEventListener(e,function(t){const e=t.target.closest(n);e&&(t.delegatedTarget=e,i.call(this,t,e))})}),n.unbind=((t,e)=>{if(t)for(let n in e){let i=e[n];n.split(/\s+/).forEach(function(e){t.removeEventListener(e,i)})}}),n.fire=((t,e,n)=>{let i=document.createEvent("HTMLEvents");i.initEvent(e,!0,!0);for(let t in n)i[t]=n[t];return t.dispatchEvent(i)}),n.data=((t,e)=>{if(!e)return t.dataset;for(const n in e)t.dataset[n]=e[n]}),n.style=((t,e)=>{if("string"==typeof e)return n.getStyle(t,e);Array.isArray(t)||(t=[t]);t.map(t=>{for(const n in e)t.style[n]=e[n]})}),n.removeStyle=((t,e)=>{Array.isArray(t)||(t=[t]);Array.isArray(e)||(e=[e]);t.map(t=>{for(const n of e)t.style[n]=""})}),n.getStyle=((t,e)=>{let n=getComputedStyle(t)[e];["width","height"].includes(e)&&(n=parseFloat(n));return n}),n.closest=((t,e)=>{if(!e)return null;if(e.matches(t))return e;return n.closest(t,e.parentNode)}),n.inViewport=((t,e)=>{const{top:top,left:left,bottom:bottom,right:right}=t.getBoundingClientRect();const{top:pTop,left:pLeft,bottom:pBottom,right:pRight}=e.getBoundingClientRect();return top>=pTop&&left>=pLeft&&bottom<=pBottom&&right<=pRight}),n.scrollTop=function(t,e){requestAnimationFrame(()=>{t.scrollTop=e})},n.scrollbarWidth=function(){const t=document.createElement("div");n.style(t,{width:"100px",height:"100px",overflow:"scroll",position:"absolute",top:"-9999px"}),document.body.appendChild(t);const e=t.offsetWidth-t.clientWidth;return document.body.removeChild(t),e};var I=i,v="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},R="object"==typeof v&&v&&v.Object===Object&&v,S="object"==typeof self&&self&&self.Object===Object&&self,$=R||S||Function("return this")(),E=function(){return $.Date.now()},k=$.Symbol,M=Object.prototype,T=M.hasOwnProperty,H=M.toString,L=k?k.toStringTag:void 0,_=o,W=Object.prototype.toString,j=s,O="[object Null]",z="[object Undefined]",A=k?k.toStringTag:void 0,B=r,F=a,D="[object Symbol]",N=l,V=NaN,q=/^\s+|\s+$/g,K=/^[-+]0x[0-9a-f]+$/i,P=/^0b[01]+$/i,X=/^0o[0-7]+$/i,U=parseInt,Z=c,G="Expected a function",J=Math.max,Q=Math.min,Y=h,tt="Expected a function";let et=u,nt=Y;class it{constructor(t){this.options=t,this.sortRows=p(this.sortRows,this),this.switchColumn=p(this.switchColumn,this),this.removeColumn=p(this.removeColumn,this),this.filterRows=p(this.filterRows,this)}init(t,e){t||(t=this.options.data),e&&(this.options.columns=e),this.data=t,this.rowCount=0,this.columns=[],this.rows=[],this.prepareColumns(),this.prepareRows(),this.prepareTreeRows(),this.prepareRowView(),this.prepareNumericColumns()}get currentSort(){return this.columns.find(t=>"none"!==t.sortOrder)||{colIndex:-1,sortOrder:"none"}}prepareColumns(){this.columns=[],this.validateColumns(),this.prepareDefaultColumns(),this.prepareHeader()}prepareDefaultColumns(){if(this.options.checkboxColumn&&!this.hasColumnById("_checkbox")){const t={id:"_checkbox",content:this.getCheckboxHTML(),editable:!1,resizable:!1,sortable:!1,focusable:!1,dropdown:!1,width:32};this.columns.push(t)}if(this.options.serialNoColumn&&!this.hasColumnById("_rowIndex")){let t={id:"_rowIndex",content:"",align:"center",editable:!1,resizable:!1,focusable:!1,dropdown:!1};this.columns.push(t)}}prepareHeader(){let t=this.columns.concat(this.options.columns);const e={isHeader:1,editable:!0,sortable:!0,resizable:!0,focusable:!0,dropdown:!0,width:null,format:t=>{if(null===t||void 0===t)return"";return t+""}};this.columns=t.map((t,e)=>this.prepareCell(t,e)).map(t=>Object.assign({},e,t)).map(t=>{t.content=t.content||t.name||"";t.id=t.id||t.content;return t})}prepareCell(t,e){const n={content:"",sortOrder:"none",colIndex:e,column:this.columns[e]};return null!==t&&"object"==typeof t?Object.assign(n,t):n.content=t,n}prepareNumericColumns(){const t=this.getRow(0);t&&(this.columns=this.columns.map((e,n)=>{const i=t[n].content;!e.align&&i&&g(i)&&(e.align="right");return e}))}prepareRows(){this.validateData(this.data),this.rows=this.data.map((t,e)=>{const n=this._getNextRowCount();let i=[];let o={rowIndex:n};if(Array.isArray(t))for(this.options.checkboxColumn&&i.push(this.getCheckboxHTML()),this.options.serialNoColumn&&i.push(n+1+""),i=i.concat(t);i.length<this.columns.length;)i.push("");else{for(let e of this.columns)"_checkbox"===e.id?i.push(this.getCheckboxHTML()):"_rowIndex"===e.id?i.push(n+1+""):i.push(t[e.id]);o.indent=t.indent||0}return this.prepareRow(i,o)})}prepareTreeRows(){this.rows.forEach((t,e)=>{if(y(t.meta.indent)){const n=this.getRow(e+1);t.meta.isLeaf=!n||C(n.meta.indent)||n.meta.indent<=t.meta.indent}})}prepareRowView(){this.rowViewOrder=this.rows.map(t=>t.meta.rowIndex)}prepareRow(t,e){const n={rowIndex:e.rowIndex,indent:e.indent};return t=t.map((t,e)=>this.prepareCell(t,e)).map(t=>Object.assign({},n,t)),t.meta=e,t}validateColumns(){const t=this.options.columns;if(!Array.isArray(t))throw new ot("`columns` must be an array");t.forEach((t,e)=>{if("string"!=typeof t&&"object"!=typeof t)throw new ot(`column "${e}" must be a string or an object`)})}validateData(t){if(Array.isArray(t)&&(0===t.length||Array.isArray(t[0])||"object"==typeof t[0]))return!0;throw new ot("`data` must be an array of arrays or objects")}appendRows(t){this.validateData(t),this.rows.push(...this.prepareRows(t))}sortRows(t,e="none"){t=+t,this.getColumns().map(n=>{n.colIndex===t?n.sortOrder=e:n.sortOrder="none"}),this._sortRows(t,e)}_sortRows(t,e){if(this.currentSort.colIndex===t&&("asc"===this.currentSort.sortOrder&&"desc"===e||"desc"===this.currentSort.sortOrder&&"asc"===e))return this.reverseArray(this.rowViewOrder),void(this.currentSort.sortOrder=e);if(this.rowViewOrder.sort((n,i)=>{const o=n;const s=i;const r=this.getCell(t,n).content;const a=this.getCell(t,i).content;if("none"===e)return o-s;if("asc"===e){if(r<a)return-1;if(r>a)return 1;if(r===a)return 0}else if("desc"===e){if(r<a)return 1;if(r>a)return-1;if(r===a)return 0}return 0}),this.hasColumnById("_rowIndex")){const t=this.getColumnIndexById("_rowIndex");this.rows.forEach((e,n)=>{const i=this.rowViewOrder.indexOf(n);const o=e[t];o.content=i+1+""})}}reverseArray(t){let e=null,n=null;for(e=0,n=t.length-1;e<n;e+=1,n-=1){const i=t[e];t[e]=t[n],t[n]=i}}switchColumn(t,e){const n=this.columns[t];this.columns[t]=this.columns[e],this.columns[e]=n,this.columns[t].colIndex=t,this.columns[e].colIndex=e,this.rows.forEach(n=>{const i=Object.assign({},n[t],{colIndex:e});const o=Object.assign({},n[e],{colIndex:t});n[e]=i;n[t]=o})}removeColumn(t){t=+t;const e=e=>e.colIndex!==t,n=(t,e)=>Object.assign({},t,{colIndex:e});this.columns=this.columns.filter(e).map(n),this.rows.forEach(e=>{e.splice(t,1);e.forEach((t,e)=>{t.colIndex=e})})}updateRow(t,e){if(t.length<this.columns.length){if(this.hasColumnById("_rowIndex")){const n=e+1+"";t=[n].concat(t)}if(this.hasColumnById("_checkbox")){const e='<input type="checkbox" />';t=[e].concat(t)}}const n=this.prepareRow(t,e),i=this.rows.findIndex(t=>t[0].rowIndex===e);return this.rows[i]=n,n}updateCell(t,e,n){let i;"object"==typeof t&&(t=(i=t).colIndex,e=i.rowIndex,n=i),i=this.getCell(t,e);for(let t in n){const e=n[t];void 0!==e&&(i[t]=e)}return i}updateColumn(t,e){const n=this.getColumn(t);for(let t in e){const i=e[t];void 0!==i&&(n[t]=i)}return n}filterRows(t,e){let n=[],i=[];return this.rows.map(t=>t[e]).forEach(e=>{const o=String(e.content||"").toLowerCase();const s=(t||"").toLowerCase();!s||o.includes(s)?i.push(e.rowIndex):n.push(e.rowIndex)}),this._filteredRows=i,{rowsToHide:n,rowsToShow:i}}getFilteredRowIndices(){return this._filteredRows||this.rows.map(t=>t.meta.rowIndex)}getRowCount(){return this.rowCount}_getNextRowCount(){const t=this.rowCount;return this.rowCount++,t}getRows(t,e){return this.rows.slice(t,e)}getRowsForView(t,e){return this.rowViewOrder.map(t=>this.rows[t]).slice(t,e)}getColumns(t){let e=this.columns;return t&&(e=e.slice(this.getStandardColumnCount())),e}getStandardColumnCount(){return this.options.checkboxColumn&&this.options.serialNoColumn?2:this.options.checkboxColumn||this.options.serialNoColumn?1:0}getColumnCount(t){let e=this.columns.length;return t&&(e-=this.getStandardColumnCount()),e}getColumn(t){return(t=+t)<0&&(t=this.columns.length+t),this.columns.find(e=>e.colIndex===t)}getColumnById(t){return this.columns.find(e=>e.id===t)}getRow(t){return t=+t,this.rows[t]}getCell(t,e){return e=+e,t=+t,this.getRow(e)[t]}getChildren(t){t=+t;const e=this.getRow(t).meta.indent,n=[];for(let i=t+1;i<this.rowCount;i++){const t=this.getRow(i);if(!isNaN(t.meta.indent)&&(t.meta.indent>e&&n.push(i),t.meta.indent===e))break}return n}getImmediateChildren(t){t=+t;const e=this.getRow(t).meta.indent,n=[],i=e+1;for(let o=t+1;o<this.rowCount;o++){const t=this.getRow(o);if(!(isNaN(t.meta.indent)||t.meta.indent>i)&&(t.meta.indent===i&&n.push(o),t.meta.indent===e))break}return n}get(){return{columns:this.columns,rows:this.rows}}getData(t){return this.data[t]}hasColumn(t){return Boolean(this.columns.find(e=>e.content===t))}hasColumnById(t){return Boolean(this.columns.find(e=>e.id===t))}getColumnIndex(t){return this.columns.findIndex(e=>e.content===t)}getColumnIndexById(t){return this.columns.findIndex(e=>e.id===t)}getCheckboxHTML(){return'<input type="checkbox" />'}}class ot extends TypeError{}class st{constructor(t){this.instance=t,w(this,this.instance,["options","fireEvent","header","datamanager","style","wrapper","rowmanager","bodyScrollable"]),this.bindEvents(),rt=rt.bind(this,this.options.dropdownButton)}renderHeader(){this.header.innerHTML="<thead></thead>",this.refreshHeader()}refreshHeader(){const t=this.datamanager.getColumns(),e=n.each(".data-table-cell[data-is-header]",this.header);!n(".data-table-cell",this.header)||t.length<e.length?(n("thead",this.header).innerHTML=this.getHeaderHTML(t),this.$filterRow=n(".data-table-row[data-is-filter]",this.header),this.$filterRow&&n.style(this.$filterRow,{display:"none"})):e.map((e,i)=>{const o=t[i];n.data(e,{colIndex:o.colIndex});const s=n(".sort-indicator",e);s&&(s.innerHTML=this.options.sortIndicator[o.sortOrder])}),this.$columnMap=[]}getHeaderHTML(t){let e=this.rowmanager.getRowHTML(t,{isHeader:1});return this.options.inlineFilters&&(e+=this.rowmanager.getRowHTML(t,{isFilter:1})),e}bindEvents(){this.bindDropdown(),this.bindResizeColumn(),this.bindMoveColumn(),this.bindFilter()}bindDropdown(){function t(t){e&&e.classList.remove("is-active"),e=null}let e;n.on(this.header,"click",".data-table-dropdown-toggle",(i,o)=>{const s=n.closest(".data-table-dropdown",o);s.classList.contains("is-active")?t():(t(),s.classList.add("is-active"),e=s)}),n.on(document.body,"click",e=>{if(e.target.matches(".data-table-dropdown-toggle"))return;t()});const i=this.options.headerDropdown;n.on(this.header,"click",".data-table-dropdown-list > div",(t,e)=>{const o=n.closest(".data-table-cell",e);const{index:index}=n.data(e);const{colIndex:colIndex}=n.data(o);let s=i[index].action;s&&s.call(this.instance,this.getColumn(colIndex))})}bindResizeColumn(){let t,e,i,o=!1;n.on(this.header,"mousedown",".data-table-cell .column-resizer",(s,r)=>{document.body.classList.add("data-table-resize");const a=r.parentNode.parentNode;t=a;const{colIndex:colIndex}=n.data(t);const l=this.getColumn(colIndex);if(l&&!1===l.resizable)return;o=!0;e=n.style(n(".content",t),"width");i=s.pageX}),n.on(document.body,"mouseup",e=>{document.body.classList.remove("data-table-resize");if(!t)return;o=!1;const{colIndex:colIndex}=n.data(t);this.setColumnWidth(colIndex);this.style.setBodyStyle();t=null}),n.on(document.body,"mousemove",s=>{if(!o)return;const r=e+(s.pageX-i);const{colIndex:colIndex}=n.data(t);if(this.getColumnMinWidth(colIndex)>r)return;this.datamanager.updateColumn(colIndex,{width:r});this.setColumnHeaderWidth(colIndex)})}bindMoveColumn(){const e=()=>{const e=n(".data-table-cell",this.header);if(!e)return;const i=n(".data-table-row",this.header);this.sortable=t.create(i,{onEnd:t=>{const{oldIndex:oldIndex,newIndex:newIndex}=t;const e=t.item;const{colIndex:colIndex}=n.data(e);if(+colIndex===newIndex)return;this.switchColumn(oldIndex,newIndex)},preventOnFilter:!1,filter:".column-resizer, .data-table-dropdown",animation:150})};n.on(document.body,"mousemove",e)}bindSortColumn(){n.on(this.header,"click",".data-table-cell .column-title",(t,e)=>{const i=e.closest(".data-table-cell");let{colIndex:colIndex,sortOrder:sortOrder="none"}=n.data(i);const o=this.getColumn(colIndex);if(o&&!1===o.sortable)return;n(".sort-indicator",this.header).textContent="";n.each(".data-table-cell",this.header).map(t=>{n.data(t,{sortOrder:"none"})});let s,r;"none"===sortOrder?(s="asc",r="▲"):"asc"===sortOrder?(s="desc",r="▼"):"desc"===sortOrder&&(s="none",r="");n.data(i,{sortOrder:s});n(".sort-indicator",i).textContent=r;this.sortColumn(colIndex,s)})}sortColumn(t,e){this.instance.freeze(),this.sortRows(t,e).then(()=>{this.refreshHeader();return this.rowmanager.refreshRows()}).then(()=>this.instance.unfreeze()).then(()=>{this.fireEvent("onSortColumn",this.getColumn(t))})}removeColumn(t){const e=this.getColumn(t);this.instance.freeze(),this.datamanager.removeColumn(t).then(()=>{this.refreshHeader();return this.rowmanager.refreshRows()}).then(()=>this.instance.unfreeze()).then(()=>{this.fireEvent("onRemoveColumn",e)})}switchColumn(t,e){this.instance.freeze(),this.datamanager.switchColumn(t,e).then(()=>{this.refreshHeader();return this.rowmanager.refreshRows()}).then(()=>{this.setColumnWidth(t);this.setColumnWidth(e);this.instance.unfreeze()}).then(()=>{this.fireEvent("onSwitchColumn",this.getColumn(t),this.getColumn(e))})}toggleFilter(t){let e;(e=void 0===t?!this.isFilterShown:t)?n.style(this.$filterRow,{display:""}):n.style(this.$filterRow,{display:"none"}),this.isFilterShown=e,this.style.setBodyStyle()}focusFilter(t){this.isFilterShown&&n(`[data-col-index="${t}"] .data-table-filter`,this.$filterRow).focus()}bindFilter(){if(this.options.inlineFilters){const t=t=>{const e=n.closest(".data-table-cell",t.target);const{colIndex:colIndex}=n.data(e);const i=t.target.value;this.datamanager.filterRows(i,colIndex).then(({rowsToHide:rowsToHide,rowsToShow:rowsToShow})=>{this.rowmanager.hideRows(rowsToHide);this.rowmanager.showRows(rowsToShow)})};n.on(this.header,"keydown",".data-table-filter",nt(t,300))}}sortRows(t,e){return this.datamanager.sortRows(t,e)}getColumn(t){return this.datamanager.getColumn(t)}getColumns(){return this.datamanager.getColumns()}setColumnWidth(t,e){t=+t,this._columnWidthMap=this._columnWidthMap||[];let n=e||this.getColumn(t).width,i=this._columnWidthMap[t];const o=`[data-col-index="${t}"] .content, [data-col-index="${t}"] .edit-cell`,s={width:n+"px"};void 0!==(i=this.style.setStyle(o,s,i))&&(this._columnWidthMap[t]=i)}setColumnHeaderWidth(t){t=+t,this.$columnMap=this.$columnMap||[];const e=`.data-table-header [data-col-index="${t}"] .content`,{width:width}=this.getColumn(t);let n=this.$columnMap[t];n||(n=this.header.querySelector(e),this.$columnMap[t]=n),n.style.width=width+"px"}getColumnMinWidth(t){return t=+t,this.getColumn(t).minWidth||24}getFirstColumnIndex(){return this.datamanager.getColumnIndexById("_rowIndex")+1}getHeaderCell$(t){return n(`.data-table-cell[data-col-index="${t}"]`,this.header)}getLastColumnIndex(){return this.datamanager.getColumnCount()-1}getSerialColumnIndex(){return this.datamanager.getColumns().findIndex(t=>t.content.includes("Sr. No"))}}var rt=function(t="v"){return`<div class="data-table-dropdown-toggle">${t}</div>\n    <div class="data-table-dropdown-list">\n      ${this.options.headerDropdown.map((t,e)=>`<div data-index="${e}">${t.label}</div>`).join("")}\n    </div>\n  `};class at{constructor(t){this.instance=t,w(this,this.instance,["wrapper","options","style","bodyScrollable","columnmanager","rowmanager","datamanager","keyboard"]),this.bindEvents()}bindEvents(){this.bindFocusCell(),this.bindEditCell(),this.bindKeyboardSelection(),this.bindCopyCellContents(),this.bindMouseEvents(),this.bindTreeEvents()}bindFocusCell(){this.bindKeyboardNav()}bindEditCell(){this.$editingCell=null,n.on(this.bodyScrollable,"dblclick",".data-table-cell",(t,e)=>{this.activateEditing(e)}),this.keyboard.on("enter",t=>{this.$focusedCell&&!this.$editingCell?this.activateEditing(this.$focusedCell):this.$editingCell&&(this.submitEditing(),this.deactivateEditing())})}bindKeyboardNav(){const t=t=>{if(!this.$focusedCell||this.$editingCell)return!1;let e=this.$focusedCell;"left"===t||"shift+tab"===t?e=this.getLeftCell$(e):"right"===t||"tab"===t?e=this.getRightCell$(e):"up"===t?e=this.getAboveCell$(e):"down"===t&&(e=this.getBelowCell$(e));this.focusCell(e);return!0},e=t=>{if(!this.$focusedCell||this.$editingCell)return!1;let e=this.$focusedCell;const{rowIndex:rowIndex,colIndex:colIndex}=n.data(e);"left"===t?e=this.getLeftMostCell$(rowIndex):"right"===t?e=this.getRightMostCell$(rowIndex):"up"===t?e=this.getTopMostCell$(colIndex):"down"===t&&(e=this.getBottomMostCell$(colIndex));this.focusCell(e);return!0};["left","right","up","down","tab","shift+tab"].map(e=>this.keyboard.on(e,()=>t(e))),["left","right","up","down"].map(t=>this.keyboard.on("ctrl+"+t,()=>e(t))),this.keyboard.on("esc",()=>{this.deactivateEditing()}),this.options.inlineFilters&&this.keyboard.on("ctrl+f",t=>{const e=n.closest(".data-table-cell",t.target);let{colIndex:colIndex}=n.data(e);this.activateFilter(colIndex);return!0})}bindKeyboardSelection(){const t=t=>{let e=this.getSelectionCursor();"left"===t?e=this.getLeftCell$(e):"right"===t?e=this.getRightCell$(e):"up"===t?e=this.getAboveCell$(e):"down"===t&&(e=this.getBelowCell$(e));return e};["left","right","up","down"].map(e=>this.keyboard.on("shift+"+e,()=>this.selectArea(t(e))))}bindCopyCellContents(){this.keyboard.on("ctrl+c",()=>{this.copyCellContents(this.$focusedCell,this.$selectionCursor)})}bindMouseEvents(){let t=null;n.on(this.bodyScrollable,"mousedown",".data-table-cell",e=>{t=!0;this.focusCell(n(e.delegatedTarget))}),n.on(this.bodyScrollable,"mouseup",()=>{t=!1});const e=e=>{if(!t)return;this.selectArea(n(e.delegatedTarget))};n.on(this.bodyScrollable,"mousemove",".data-table-cell",et(e,50))}bindTreeEvents(){n.on(this.bodyScrollable,"click",".toggle",(t,e)=>{const i=n.closest(".data-table-cell",e);const{rowIndex:rowIndex}=n.data(i);i.classList.contains("tree-close")?this.rowmanager.openSingleNode(rowIndex):this.rowmanager.closeSingleNode(rowIndex)})}focusCell(t,{skipClearSelection:skipClearSelection=0}={}){if(t&&t!==this.$editingCell){const{colIndex:colIndex,isHeader:isHeader}=n.data(t);isHeader||!1!==this.columnmanager.getColumn(colIndex).focusable&&(this.scrollToCell(t),this.deactivateEditing(),skipClearSelection||this.clearSelection(),this.$focusedCell&&this.$focusedCell.classList.remove("selected"),this.$focusedCell=t,t.classList.add("selected"),t.focus(),this.highlightRowColumnHeader(t))}}highlightRowColumnHeader(t){const{colIndex:colIndex,rowIndex:rowIndex}=n.data(t),e=`.data-table-header .data-table-cell[data-col-index="${colIndex}"]`,i=`.data-table-cell[data-row-index="${rowIndex}"][data-col-index="${this.datamanager.getColumnIndexById("_rowIndex")}"]`;this.lastHeaders&&n.removeStyle(this.lastHeaders,"backgroundColor");const o=n(e,this.wrapper),s=n(i,this.wrapper);n.style([o,s],{backgroundColor:"#f5f7fa"}),this.lastHeaders=[o,s]}selectAreaOnClusterChanged(){if(this.$focusedCell&&this.$selectionCursor){const{colIndex:colIndex,rowIndex:rowIndex}=n.data(this.$selectionCursor),t=this.getCell$(colIndex,rowIndex);if(t&&t!==this.$selectionCursor){const e=n.data(this.$focusedCell);this.$focusedCell=this.getCell$(e.colIndex,e.rowIndex),this.selectArea(t)}}}focusCellOnClusterChanged(){if(this.$focusedCell){const{colIndex:colIndex,rowIndex:rowIndex}=n.data(this.$focusedCell),t=this.getCell$(colIndex,rowIndex);t&&this.focusCell(t,{skipClearSelection:1})}}selectArea(t){this.$focusedCell&&this._selectArea(this.$focusedCell,t)&&(this.$selectionCursor=t)}_selectArea(t,e){if(t===e)return!1;const n=this.getCellsInRange(t,e);return!!n&&(this.clearSelection(),n.map(t=>this.getCell$(...t)).map(t=>t.classList.add("highlight")),!0)}getCellsInRange(t,e){let i,o,s,r;if("number"==typeof t)[i,o,s,r]=arguments;else if("object"==typeof t){if(!t||!e)return!1;const a=n.data(t),l=n.data(e);i=a.colIndex,o=a.rowIndex,s=l.colIndex,r=l.rowIndex}if(o>r&&([o,r]=[r,o]),i>s&&([i,s]=[s,i]),this.isStandardCell(i)||this.isStandardCell(s))return!1;let a=[],l=i,c=o,h=[];for(;c<=r;)h.push(c),c++;return h.map(t=>{for(;l<=s;)a.push([l,t]),l++;l=i}),a}clearSelection(){n.each(".data-table-cell.highlight",this.bodyScrollable).map(t=>t.classList.remove("highlight")),this.$selectionCursor=null}getSelectionCursor(){return this.$selectionCursor||this.$focusedCell}activateEditing(t){this.focusCell(t);const{rowIndex:rowIndex,colIndex:colIndex}=n.data(t),e=this.columnmanager.getColumn(colIndex);if(!e||!1!==e.editable&&!1!==e.focusable){const i=this.getCell(colIndex,rowIndex);if(!i||!1!==i.editable){if(this.$editingCell){const{_rowIndex:_rowIndex,_colIndex:_colIndex}=n.data(this.$editingCell);if(rowIndex===_rowIndex&&colIndex===_colIndex)return}this.$editingCell=t,t.classList.add("editing");const o=n(".edit-cell",t);o.innerHTML="";const s=this.getEditor(colIndex,rowIndex,i.content,o);s&&(this.currentCellEditor=s,s.initValue(i.content,rowIndex,e))}}}deactivateEditing(){this.$focusedCell&&this.$focusedCell.focus(),this.$editingCell&&(this.$editingCell.classList.remove("editing"),this.$editingCell=null)}getEditor(t,e,n,i){const o=this.datamanager.getColumn(t),s=this.datamanager.getRow(e),r=this.datamanager.getData(e);let a=this.options.getEditor?this.options.getEditor(t,e,n,i,o,s,r):this.getDefaultEditor(i);return!1!==a&&(void 0===a&&(a=this.getDefaultEditor(i)),a)}getDefaultEditor(t){const e=n.create("input",{class:"input-style",type:"text",inside:t});return{initValue(t){e.focus(),e.value=t},getValue(){return e.value},setValue(t){e.value=t}}}submitEditing(){if(this.$editingCell){const t=this.$editingCell,{rowIndex:rowIndex,colIndex:colIndex}=n.data(t),e=this.datamanager.getColumn(colIndex);if(t){const n=this.currentCellEditor;if(n){const i=n.getValue(),o=n.setValue(i,rowIndex,e),s=this.getCell(colIndex,rowIndex).content;this.updateCell(colIndex,rowIndex,i),t.focus(),o&&o.then&&o.catch(t=>{console.log(t);this.updateCell(colIndex,rowIndex,s)})}}this.currentCellEditor=null}}copyCellContents(t,e){if(!e&&t){const{colIndex:colIndex,rowIndex:rowIndex}=n.data(t),e=this.getCell(colIndex,rowIndex);return void m(e.content)}const i=this.getCellsInRange(t,e);i&&m(i.map(t=>this.getCell(...t)).reduce((t,e)=>{const n=e.rowIndex;t[n]=t[n]||[];t[n].push(e.content);return t},[]).map(t=>t.join("\t")).join("\n"))}activateFilter(t){this.columnmanager.toggleFilter(),this.columnmanager.focusFilter(t),this.columnmanager.isFilterShown||this.$focusedCell.focus()}updateCell(t,e,n){const i=this.datamanager.updateCell(t,e,{content:n});this.refreshCell(i)}refreshCell(t){n(this.selector(t.colIndex,t.rowIndex),this.bodyScrollable).innerHTML=this.getCellContent(t)}toggleTreeButton(t,e){const n=this.columnmanager.getFirstColumnIndex(),i=this.getCell$(n,t);i&&i.classList[e?"remove":"add"]("tree-close")}isStandardCell(t){return t<this.columnmanager.getFirstColumnIndex()}getCell$(t,e){return n(this.selector(t,e),this.bodyScrollable)}getAboveCell$(t){const{colIndex:colIndex}=n.data(t);let e=t.parentElement.previousElementSibling;for(;e&&e.classList.contains("hide");)e=e.previousElementSibling;return e?n(`[data-col-index="${colIndex}"]`,e):t}getBelowCell$(t){const{colIndex:colIndex}=n.data(t);let e=t.parentElement.nextElementSibling;for(;e&&e.classList.contains("hide");)e=e.nextElementSibling;return e?n(`[data-col-index="${colIndex}"]`,e):t}getLeftCell$(t){return t.previousElementSibling}getRightCell$(t){return t.nextElementSibling}getLeftMostCell$(t){return this.getCell$(this.columnmanager.getFirstColumnIndex(),t)}getRightMostCell$(t){return this.getCell$(this.columnmanager.getLastColumnIndex(),t)}getTopMostCell$(t){return this.getCell$(t,this.rowmanager.getFirstRowIndex())}getBottomMostCell$(t){return this.getCell$(t,this.rowmanager.getLastRowIndex())}getCell(t,e){return this.instance.datamanager.getCell(t,e)}getCellAttr(t){return this.instance.getCellAttr(t)}getRowHeight(){return n.style(n(".data-table-row",this.bodyScrollable),"height")}scrollToCell(t){if(n.inViewport(t,this.bodyScrollable))return!1;const{rowIndex:rowIndex}=n.data(t);return this.rowmanager.scrollToRow(rowIndex),!1}getRowCountPerPage(){return Math.ceil(this.instance.getViewportHeight()/this.getRowHeight())}getCellHTML(t){const{rowIndex:rowIndex,colIndex:colIndex,isHeader:isHeader,isFilter:isFilter}=t;return`\n            <td class="data-table-cell noselect" ${f({rowIndex:rowIndex,colIndex:colIndex,isHeader:isHeader,isFilter:isFilter})} tabindex="0">\n                ${this.getCellContent(t)}\n            </td>\n        `}getCellContent(t){const{isHeader:isHeader,isFilter:isFilter}=t,e=!isHeader&&!1!==t.editable?this.getEditCellHTML():"",n=isHeader&&!1!==t.sortable?'<span class="sort-indicator"></span>':"",i=isHeader&&!1!==t.resizable?'<span class="column-resizer"></span>':"",o=isHeader&&!1!==t.dropdown?`<div class="data-table-dropdown">${rt()}</div>`:"",s=t.format||t.column&&t.column.format||null;let r;if(isHeader||isFilter||!s)r=t.content;else{const e=this.datamanager.getRow(t.rowIndex),n=this.datamanager.getData(t.rowIndex);r=s(t.content,e,t.column,n)}if(this.options.treeView&&!isHeader&&!isFilter&&void 0!==t.indent){const e=this.datamanager.getRow(t.rowIndex+1),n=e&&e.meta.indent>t.indent,i=this.datamanager.getColumnIndexById("_rowIndex")+1;if(i===t.colIndex){const e=1.5*((t.indent||0)+1),i=n?`<span class="toggle" style="left: ${e-1.5}rem"></span>`:"";r=`<span class="tree-node" style="padding-left: ${e}rem">\n                    ${i}${r}</span>`}}return`\n            <div class="content ellipsis">\n                ${r}\n                ${n}\n                ${i}\n                ${o}\n            </div>\n            ${e}\n        `}getEditCellHTML(){return`\n      <div class="edit-cell"></div>\n    `}selector(t,e){return`.data-table-cell[data-col-index="${t}"][data-row-index="${e}"]`}}class lt{constructor(t){this.instance=t,w(this,this.instance,["options","fireEvent","wrapper","bodyScrollable","bodyRenderer"]),this.bindEvents(),this.refreshRows=p(this.refreshRows,this)}get datamanager(){return this.instance.datamanager}get cellmanager(){return this.instance.cellmanager}bindEvents(){this.bindCheckbox()}bindCheckbox(){this.options.checkboxColumn&&(this.checkMap=[],n.on(this.wrapper,"click",'.data-table-cell[data-col-index="0"] [type="checkbox"]',(t,e)=>{const i=e.closest(".data-table-cell");const{rowIndex:rowIndex,isHeader:isHeader}=n.data(i);const o=e.checked;isHeader?this.checkAll(o):this.checkRow(rowIndex,o)}))}refreshRows(){this.instance.renderBody(),this.instance.setDimensions()}refreshRow(t,e){this.datamanager.updateRow(t,e).forEach(t=>{this.cellmanager.refreshCell(t)})}getCheckedRows(){if(!this.checkMap)return[];let t=[];for(let e in this.checkMap){const n=this.checkMap[e];1===n&&t.push(e)}return t}highlightCheckedRows(){this.getCheckedRows().map(t=>this.checkRow(t,!0))}checkRow(t,e){const i=e?1:0,o=t=>`.data-table-cell[data-row-index="${t}"][data-col-index="0"] [type="checkbox"]`;this.checkMap[t]=i,n.each(o(t),this.bodyScrollable).map(t=>{t.checked=e}),this.highlightRow(t,e),this.showCheckStatus(),this.fireEvent("onCheckRow",this.datamanager.getRow(t))}checkAll(t){const e=t?1:0;this.checkMap=t?Array.from(Array(this.getTotalRows())).map(t=>e):[],n.each('.data-table-cell[data-col-index="0"] [type="checkbox"]',this.bodyScrollable).map(e=>{e.checked=t}),this.highlightAll(t),this.showCheckStatus()}showCheckStatus(){if(this.options.checkedRowStatus){const t=this.getCheckedRows().length;t>0?this.bodyRenderer.showToastMessage(`${t} row${t>1?"s":""} selected`):this.bodyRenderer.clearToastMessage()}}highlightRow(t,e=!0){const n=this.getRow$(t);if(n){if(!e&&this.bodyScrollable.classList.contains("row-highlight-all"))return void n.classList.add("row-unhighlight");e&&n.classList.contains("row-unhighlight")&&n.classList.remove("row-unhighlight"),this._highlightedRows=this._highlightedRows||{},e?(n.classList.add("row-highlight"),this._highlightedRows[t]=n):(n.classList.remove("row-highlight"),delete this._highlightedRows[t])}}highlightAll(t=!0){if(t)this.bodyScrollable.classList.add("row-highlight-all");else{this.bodyScrollable.classList.remove("row-highlight-all");for(const t in this._highlightedRows){const e=this._highlightedRows[t];e.classList.remove("row-highlight")}this._highlightedRows={}}}hideRows(t){(t=x(t)).map(t=>{const e=this.getRow$(t);e.classList.add("hide")})}showRows(t){(t=x(t)).map(t=>{const e=this.getRow$(t);e.classList.remove("hide")})}openSingleNode(t){const e=this.datamanager.getImmediateChildren(t);this.showRows(e),this.cellmanager.toggleTreeButton(t,!0)}closeSingleNode(t){this.datamanager.getImmediateChildren(t).forEach(t=>{const e=this.datamanager.getRow(t);e.meta.isLeaf?(this.hideRows(t),this.cellmanager.toggleTreeButton(t,!1)):(this.closeSingleNode(t),this.hideRows(t))}),this.cellmanager.toggleTreeButton(t,!1)}getRow$(t){return n(this.selector(t),this.bodyScrollable)}getTotalRows(){return this.datamanager.getRowCount()}getFirstRowIndex(){return 0}getLastRowIndex(){return this.datamanager.getRowCount()-1}scrollToRow(t){t=+t,this._lastScrollTo=this._lastScrollTo||0;const e=this.getRow$(t);if(!n.inViewport(e,this.bodyScrollable)){const{height:height}=e.getBoundingClientRect(),{top:top,bottom:bottom}=this.bodyScrollable.getBoundingClientRect(),i=Math.floor((bottom-top)/height);let o=0;o=t>this._lastScrollTo?height*(t+1-i):height*(t+1-1),this._lastScrollTo=t,n.scrollTop(this.bodyScrollable,o)}}getRowHTML(t,e){const n=f(e);return e.isFilter&&(t=t.map(t=>Object.assign({},t,{content:this.getFilterInput({colIndex:t.colIndex}),isFilter:1,isHeader:void 0,editable:!1}))),`\n            <tr class="data-table-row" ${n}>\n                ${t.map(t=>this.cellmanager.getCellHTML(t)).join("")}\n            </tr>\n        `}getFilterInput(t){return`<input class="data-table-filter input-style" type="text" ${f(t)} />`}selector(t){return`.data-table-row[data-row-index="${t}"]`}}class ct{constructor(t){this.instance=t,this.options=t.options,this.datamanager=t.datamanager,this.rowmanager=t.rowmanager,this.cellmanager=t.cellmanager,this.bodyScrollable=t.bodyScrollable,this.log=t.log,this.appendRemainingData=p(this.appendRemainingData,this)}render(){this.options.clusterize?this.renderBodyWithClusterize():this.renderBodyHTML()}renderBodyHTML(){const t=this.datamanager.getRowsForView();this.bodyScrollable.innerHTML=`\n            <table class="data-table-body">\n                ${this.getBodyHTML(t)}\n            </table>\n        `,this.instance.setDimensions(),this.restoreState()}renderBodyWithClusterize(){const t=this.datamanager.getRowsForView(0,20);let i=this.getDataForClusterize(t);0===i.length&&(i=[`<tr class="no-data"><td>${this.options.noDataMessage}</td></tr>`]),this.clusterize?this.clusterize.update(i):(this.bodyScrollable.innerHTML=`\n                <table class="data-table-body">\n                    ${this.getBodyHTML([])}\n                </table>\n            `,this.clusterize=new e({rows:i,scrollElem:this.bodyScrollable,contentElem:n("tbody",this.bodyScrollable),callbacks:{clusterChanged:()=>{this.restoreState()}},show_no_data_row:!1}),this.instance.setDimensions()),this.appendRemainingData()}restoreState(){this.rowmanager.highlightCheckedRows(),this.cellmanager.selectAreaOnClusterChanged(),this.cellmanager.focusCellOnClusterChanged()}appendRemainingData(){const t=this.datamanager.getRowsForView(20),e=this.getDataForClusterize(t);this.clusterize.append(e)}showToastMessage(t){this.instance.toastMessage.innerHTML=`<span>${t}</span>`}clearToastMessage(){this.instance.toastMessage.innerHTML=""}getDataForClusterize(t){return t.map(t=>this.rowmanager.getRowHTML(t,t.meta))}getBodyHTML(t){return`\n            <tbody>\n                ${t.map(t=>this.rowmanager.getRowHTML(t,t.meta)).join("")}\n            </tbody>\n        `}}class ht{constructor(t){this.instance=t,w(this,this.instance,["options","datamanager","columnmanager","header","bodyScrollable","datatableWrapper","getColumn"]),this.scopeClass="datatable-instance-"+t.constructor.instances,t.datatableWrapper.classList.add(this.scopeClass);const e=document.createElement("style");t.wrapper.insertBefore(e,t.datatableWrapper),this.styleEl=e,this.bindResizeWindow()}get stylesheet(){return this.styleEl.sheet}bindResizeWindow(){"fluid"===this.options.layout&&n.on(window,"resize",et(()=>{this.distributeRemainingWidth();this.refreshColumnWidth();this.compensateScrollbarWidth();this.setBodyStyle()},300))}destroy(){this.styleEl.remove()}setStyle(t,e,n=-1){const i=Object.keys(e).map(t=>{t.includes("-")||(t=d(t));return`${t}:${e[t]};`}).join("");let o=`${t.split(",").map(t=>`.${this.scopeClass} ${t}`).join(",")} { ${i} }`;if(this.stylesheet){let t=this.stylesheet.cssRules.length;return-1!==n&&(this.stylesheet.deleteRule(n),t=n),this.stylesheet.insertRule(o,t),t}}setDimensions(){this.setHeaderStyle(),this.setupMinWidth(),this.setupNaturalColumnWidth(),this.setupColumnWidth(),this.distributeRemainingWidth(),this.setColumnStyle(),this.compensateScrollbarWidth(),this.setDefaultCellHeight(),this.setBodyStyle()}setHeaderStyle(){"fluid"===this.options.layout&&n.style(this.header,{width:0}),n.style(this.header,{margin:0});const t=this.datamanager.getColumns().filter(t=>!1===t.resizable).map(t=>t.colIndex).map(t=>`.data-table-header [data-col-index="${t}"]`).join();this.setStyle(t,{cursor:"pointer"})}setupMinWidth(){n.each(".data-table-cell[data-is-header]",this.header).map(t=>{const e=n.style(n(".content",t),"width");const{colIndex:colIndex}=n.data(t);const i=this.getColumn(colIndex);i.minWidth||(i.minWidth=e)})}setupNaturalColumnWidth(){n(".data-table-row")&&n.each('.data-table-row[data-row-index="0"] .data-table-cell',this.bodyScrollable).map(t=>{const{colIndex:colIndex}=n.data(t);const e=this.datamanager.getColumn(colIndex);let i=n.style(n(".content",t),"width");"_rowIndex"===e.id&&(i=this.getRowIndexColumnWidth(i),e.width=i);e.naturalWidth=i})}setupColumnWidth(){if("ratio"===this.options.layout){let t=n.style(this.datatableWrapper,"width");if(this.options.serialNoColumn){const e=this.datamanager.getColumnById("_rowIndex");t=t-e.width-1}if(this.options.checkboxColumn){const e=this.datamanager.getColumnById("_checkbox");t=t-e.width-1}const e=this.datamanager.getColumns().map(t=>{if("_rowIndex"===t.id||"_checkbox"===t.id)return 0;t.width||(t.width=1);t.ratioWidth=parseInt(t.width,10);return t.ratioWidth}).reduce((t,e)=>t+e),i=t/e;this.datamanager.getColumns().map(t=>{if("_rowIndex"===t.id||"_checkbox"===t.id)return;t.width=Math.floor(i*t.ratioWidth)-1})}else this.datamanager.getColumns().map(t=>{t.width||(t.width=t.naturalWidth);t.width<t.minWidth&&(t.width=t.minWidth)})}compensateScrollbarWidth(){const t=n.scrollbarWidth(),e=this.datamanager.getColumn(-1),i=e.width-t;this.columnmanager.setColumnWidth(e.colIndex,i)}distributeRemainingWidth(){if("fluid"===this.options.layout){const t=n.style(this.instance.datatableWrapper,"width"),e=n.style(this.header,"width"),i=this.datamanager.getColumns().filter(t=>t.resizable),o=(t-e)/i.length;i.map(t=>{const e=n.style(this.getColumnHeaderElement(t.colIndex),"width");let i=Math.floor(e+o)-2;this.datamanager.updateColumn(t.colIndex,{width:i})})}}setDefaultCellHeight(){if(!this.options.dynamicRowHeight&&!this.__cellHeightSet){const t=n(".data-table-cell[data-is-header]",this.instance.header);if(t){const e=this.options.cellHeight||n.style(t,"height");e&&(this.setCellHeight(e),this.__cellHeightSet=!0)}}}setCellHeight(t){this.setStyle(".data-table-cell .content",{height:t+"px"}),this.setStyle(".data-table-cell .edit-cell",{height:t+"px"})}setColumnStyle(){this.datamanager.getColumns().map(t=>{["left","center","right"].includes(t.align)&&this.setStyle(`[data-col-index="${t.colIndex}"]`,{"text-align":t.align});this.columnmanager.setColumnHeaderWidth(t.colIndex);this.columnmanager.setColumnWidth(t.colIndex)}),this.setBodyStyle()}refreshColumnWidth(){this.datamanager.getColumns().map(t=>{this.columnmanager.setColumnHeaderWidth(t.colIndex);this.columnmanager.setColumnWidth(t.colIndex)})}setBodyStyle(){const t=n.style(this.header,"width");n.style(this.bodyScrollable,{width:t+"px"});const e=n(".data-table-body",this.bodyScrollable);e&&n.style(e,{height:"0px"}),n.style(this.bodyScrollable,{marginTop:n.style(this.header,"height")+"px"}),n.style(n("table",this.bodyScrollable),{margin:0,width:"100%"})}getColumnHeaderElement(t){return t=+t,t<0?null:n(`.data-table-cell[data-col-index="${t}"]`,this.header)}getRowIndexColumnWidth(t){this._rowIndexColumnWidthMap=this._rowIndexColumnWidthMap||{};const e=(this.datamanager.getRowCount()+"").length;return this._rowIndexColumnWidthMap[e]||(this._rowIndexColumnWidthMap[e]=t+8*(e-1)),this._rowIndexColumnWidthMap[e]}}const ut={13:"enter",91:"meta",16:"shift",17:"ctrl",18:"alt",37:"left",38:"up",39:"right",40:"down",9:"tab",27:"esc",67:"c",70:"f"};class dt{constructor(t){this.listeners={},n.on(t,"keydown",this.handler.bind(this))}handler(t){let e=ut[t.keyCode];t.shiftKey&&"shift"!==e&&(e="shift+"+e),(t.ctrlKey&&"ctrl"!==e||t.metaKey&&"meta"!==e)&&(e="ctrl+"+e);const n=this.listeners[e];if(n&&n.length>0)for(let e of n){const n=e(t);void 0!==n&&!0!==n||t.preventDefault()}}on(t,e){t.split(",").map(t=>t.trim()).map(t=>{this.listeners[t]=this.listeners[t]||[];this.listeners[t].push(e)})}}var ft={columns:[],data:[],dropdownButton:"▼",headerDropdown:[{label:"Sort Ascending",action:function(t){this.sortColumn(t.colIndex,"asc")}},{label:"Sort Descending",action:function(t){this.sortColumn(t.colIndex,"desc")}},{label:"Reset sorting",action:function(t){this.sortColumn(t.colIndex,"none")}},{label:"Remove column",action:function(t){this.removeColumn(t.colIndex)}}],events:{onRemoveColumn(t){},onSwitchColumn(t,e){},onSortColumn(t){},onCheckRow(t){}},sortIndicator:{asc:"↑",desc:"↓",none:""},freezeMessage:"",getEditor:null,serialNoColumn:!0,checkboxColumn:!1,clusterize:!0,logs:!1,layout:"fixed",noDataMessage:"No Data",cellHeight:null,inlineFilters:!1,treeView:!1,checkedRowStatus:!0,dynamicRowHeight:!1};class mt{constructor(t,e){if(mt.instances++,"string"==typeof t&&(t=document.querySelector(t)),this.wrapper=t,!(this.wrapper instanceof HTMLElement))throw new Error("Invalid argument given for `wrapper`");this.buildOptions(e),this.prepare(),this.style=new ht(this),this.keyboard=new dt(this.wrapper),this.datamanager=new it(this.options),this.rowmanager=new lt(this),this.columnmanager=new st(this),this.cellmanager=new at(this),this.bodyRenderer=new ct(this),this.options.data&&this.refresh()}buildOptions(t){this.options=this.options||{},this.options=Object.assign({},ft,this.options||{},t),this.options.headerDropdown.push(...t.headerDropdown||[]),this.events=Object.assign({},ft.events,this.options.events||{},t.events||{}),this.fireEvent=this.fireEvent.bind(this)}prepare(){this.prepareDom(),this.unfreeze()}prepareDom(){this.wrapper.innerHTML=`\n            <div class="data-table">\n                <table class="data-table-header">\n                </table>\n                <div class="body-scrollable">\n                </div>\n                <div class="freeze-container">\n                <span>${this.options.freezeMessage}</span>\n                </div>\n                <div class="data-table-footer">\n                </div>\n                <div class="toast-message"></div>\n            </div>\n        `,this.datatableWrapper=n(".data-table",this.wrapper),this.header=n(".data-table-header",this.wrapper),this.bodyScrollable=n(".body-scrollable",this.wrapper),this.freezeContainer=n(".freeze-container",this.wrapper),this.toastMessage=n(".toast-message",this.wrapper)}refresh(t,e){this.datamanager.init(t,e),this.render(),this.setDimensions()}destroy(){this.wrapper.innerHTML="",this.style.destroy()}appendRows(t){this.datamanager.appendRows(t),this.rowmanager.refreshRows()}refreshRow(t,e){this.rowmanager.refreshRow(t,e)}render(){this.renderHeader(),this.renderBody()}renderHeader(){this.columnmanager.renderHeader()}renderBody(){this.bodyRenderer.render()}setDimensions(){this.style.setDimensions()}showToastMessage(t){this.bodyRenderer.showToastMessage(t)}clearToastMessage(){this.bodyRenderer.clearToastMessage()}getColumn(t){return this.datamanager.getColumn(t)}getColumns(){return this.datamanager.getColumns()}getRows(){return this.datamanager.getRows()}getCell(t,e){return this.datamanager.getCell(t,e)}getColumnHeaderElement(t){return this.columnmanager.getColumnHeaderElement(t)}getViewportHeight(){return this.viewportHeight||(this.viewportHeight=n.style(this.bodyScrollable,"height")),this.viewportHeight}sortColumn(t,e){this.columnmanager.sortColumn(t,e)}removeColumn(t){this.columnmanager.removeColumn(t)}scrollToLastColumn(){this.datatableWrapper.scrollLeft=9999}freeze(){n.style(this.freezeContainer,{display:""})}unfreeze(){n.style(this.freezeContainer,{display:"none"})}updateOptions(t){this.buildOptions(t)}fireEvent(t,...e){this.events[t].apply(this,e)}log(){this.options.logs&&console.log.apply(console,arguments)}}mt.instances=0;var gt={name:"frappe-datatable",version:"0.0.4",description:"A modern datatable library for the web",main:"dist/frappe-datatable.cjs.js",scripts:{start:"yarn run dev",build:"rollup -c",production:"rollup -c --production","build:docs":"rollup -c --docs",dev:"rollup -c -w",test:"mocha --compilers js:babel-core/register --colors ./test/*.spec.js","test:watch":"mocha --compilers js:babel-core/register --colors -w ./test/*.spec.js"},devDependencies:{chai:"3.5.0",cssnano:"^3.10.0",deepmerge:"^2.0.1",eslint:"3.19.0","eslint-loader":"1.7.1",mocha:"3.3.0","postcss-cssnext":"^3.1.0","postcss-nested":"^3.0.0",precss:"^3.1.0","rollup-plugin-commonjs":"^8.3.0","rollup-plugin-json":"^2.3.0","rollup-plugin-node-resolve":"^3.0.3","rollup-plugin-postcss":"^1.2.8","rollup-plugin-uglify":"^3.0.0","rollup-plugin-uglify-es":"^0.0.1"},repository:{type:"git",url:"https://github.com/frappe/datatable.git"},keywords:["datatable","data","grid","table"],author:"Faris Ansari",license:"MIT",bugs:{url:"https://github.com/frappe/datatable/issues"},homepage:"https://frappe.github.io/datatable",dependencies:{"clusterize.js":"^0.18.0",lodash:"^4.17.5",sortablejs:"^1.7.0"}};return mt.__version__=gt.version,mt}(Sortable,Clusterize);

window.DataTable = DataTable;

}

mFrappeDataTable.call(window);

//------------------------------------------------------------------------------
