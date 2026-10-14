
var merge = m.util.merge;

//------------------------------------------------------------------------------
// Class -----------------------------------------------------------------------
//------------------------------------------------------------------------------

function Select()
{
  return Select.Class.construct(this, arguments);
}

Class(Select)
.inherit(ElementConfInputStoreMapStore)
//.property("conf", {defaultSelected: false, searchable: true, clearable: true, placeholder: "-", searchPlaceholder: "...", tagPlaceholder: ":"})
//.property("conf", {locale: "en", search: true, deselect: true, placeholder: "...", descriptions: true})
.property("conf", {locale: "en", search: true, deselect: false, placeholder: "...", descriptions: true})
.event("ConfChanged", function(value, prev)
{
  this.rebuild();
})
.property("value")
.getter("value", function(value)
{
  return this.select.value;
})
.setter("value", function(value)
{
  this.select.value = value;
  this.rebuild();
  
  return value;
})
.property("first")
.property("last")
.property("map")
.setter("map", function(value)
{
  // todo translate table to items with eventual indexes as properties
  var conf = this.conf();
//  conf.data = value;
  conf.items = value;
  // if first add on top if last add at end
  var first = this.first();
  if(typeof first !== "undefined")
  {
    conf.items = merge(first, conf.items, true, true);
  }
  var last = this.last();
  if(typeof last !== "undefined")
  {
    conf.items = merge(conf.items, last, true, true);
  }
  this.conf(conf);
})
.properties()
;

//------------------------------------------------------------------------------
// Methods ---------------------------------------------------------------------
//------------------------------------------------------------------------------

Select.prototype.construct = function()
{
  this.rebuild();
};

//------------------------------------------------------------------------------

Select.prototype.update = function()
{
  this.rebuild();
};

//------------------------------------------------------------------------------

Select.prototype.rebuild = function()
{
  var value = this.value();
  this.html("");
  
  this._label = document.createElement("label");
  this._label.style.display = "none";
  this.node.appendChild(this._label);
  this.label(this.label());
  
  this.select = document.createElement("select");
  this.node.appendChild(this.select);
//  this.selectr = new Selectr(this.select, this.conf());
//  this.selectr = new tail.select(this.select, this.conf());
  var c = m.util.clone(this.conf(), true);
//  for(var k in )
//  {
//    c[k] = this.selectr.config()[k];
//  }
//  console.log("select", c);
  if(c.items)
  {
    var item = c.items[value];
    if(item)
    {
      if(typeof item === "string")
      {
        item = {value: item};
      }
      item.selected = true;
      c.items[value] = item;
    }
  }
//  console.log("select", c);
  this.selectr = new tail.select(this.select, c);
};

//------------------------------------------------------------------------------

function mSelectr_()
{
/*
 Selectr 2.4.13
 http://mobius.ovh/docs/selectr

 Released under the MIT license
*/
(function(g,k){"function"===typeof define&&define.amd?define([],k):"object"===typeof exports?module.exports=k("Selectr"):g.Selectr=k("Selectr")})(this,function(g){function k(a,c){return a.hasOwnProperty(c)&&(!0===a[c]||a[c].length)}function n(a,c,e){a.parentNode?a.parentNode.parentNode||c.appendChild(a.parentNode):c.appendChild(a);b.removeClass(a,"excluded");e||(a.innerHTML=a.textContent)}var l=function(){};l.prototype={on:function(a,c){this._events=this._events||{};this._events[a]=this._events[a]||
[];this._events[a].push(c)},off:function(a,c){this._events=this._events||{};!1!==a in this._events&&this._events[a].splice(this._events[a].indexOf(c),1)},emit:function(a){this._events=this._events||{};if(!1!==a in this._events)for(var c=0;c<this._events[a].length;c++)this._events[a][c].apply(this,Array.prototype.slice.call(arguments,1))}};l.mixin=function(a){for(var c=["on","off","emit"],b=0;b<c.length;b++)"function"===typeof a?a.prototype[c[b]]=l.prototype[c[b]]:a[c[b]]=l.prototype[c[b]];return a};
var b={extend:function(a,c){for(var e in c)if(c.hasOwnProperty(e)){var d=c[e];d&&"[object Object]"===Object.prototype.toString.call(d)?(a[e]=a[e]||{},b.extend(a[e],d)):a[e]=d}return a},each:function(a,c,b){if("[object Object]"===Object.prototype.toString.call(a))for(var d in a)Object.prototype.hasOwnProperty.call(a,d)&&c.call(b,d,a[d],a);else{d=0;for(var e=a.length;d<e;d++)c.call(b,d,a[d],a)}},createElement:function(a,c){var b=document,d=b.createElement(a);if(c&&"[object Object]"===Object.prototype.toString.call(c))for(var f in c)if(f in
d)d[f]=c[f];else if("html"===f)d.innerHTML=c[f];else if("text"===f){var h=b.createTextNode(c[f]);d.appendChild(h)}else d.setAttribute(f,c[f]);return d},hasClass:function(a,b){if(a)return a.classList?a.classList.contains(b):!!a.className&&!!a.className.match(new RegExp("(\\s|^)"+b+"(\\s|$)"))},addClass:function(a,c){b.hasClass(a,c)||(a.classList?a.classList.add(c):a.className=a.className.trim()+" "+c)},removeClass:function(a,c){b.hasClass(a,c)&&(a.classList?a.classList.remove(c):a.className=a.className.replace(new RegExp("(^|\\s)"+
c.split(" ").join("|")+"(\\s|$)","gi")," "))},closest:function(a,c){return a&&a!==document.body&&(c(a)?a:b.closest(a.parentNode,c))},isInt:function(a){return"number"===typeof a&&isFinite(a)&&Math.floor(a)===a},debounce:function(a,b,e){var d;return function(){var c=this,h=arguments,g=e&&!d;clearTimeout(d);d=setTimeout(function(){d=null;e||a.apply(c,h)},b);g&&a.apply(c,h)}},rect:function(a,b){var c=window,d=a.getBoundingClientRect(),f=b?c.pageXOffset:0;c=b?c.pageYOffset:0;return{bottom:d.bottom+c,height:d.height,
left:d.left+f,right:d.right+f,top:d.top+c,width:d.width}},includes:function(a,b){return-1<a.indexOf(b)},startsWith:function(a,b){return a.substr(0,b.length)===b},truncate:function(a){for(;a.firstChild;)a.removeChild(a.firstChild)}},p=function(){if(this.items.length){var a=document.createDocumentFragment();if(this.config.pagination){var c=this.pages.slice(0,this.pageIndex);b.each(c,function(c,d){b.each(d,function(d,b){n(b,a,this.customOption)},this)},this)}else b.each(this.items,function(b,d){n(d,
a,this.customOption)},this);a.childElementCount&&(b.removeClass(this.items[this.navIndex],"active"),this.navIndex=(a.querySelector(".selectr-option.selected")||a.querySelector(".selectr-option")).idx,b.addClass(this.items[this.navIndex],"active"));this.tree.appendChild(a)}},t=function(a){this.container.contains(a.target)||!this.opened&&!b.hasClass(this.container,"notice")||this.close()},m=function(a,c){var e=this.customOption?this.config.renderOption(c||a):a.textContent;e=b.createElement("li",{"class":"selectr-option",
html:e,role:"treeitem","aria-selected":!1});e.idx=a.idx;this.items.push(e);a.defaultSelected&&this.defaultSelected.push(a.idx);a.disabled&&(e.disabled=!0,b.addClass(e,"disabled"));return e},u=function(){this.requiresPagination=this.config.pagination&&0<this.config.pagination;k(this.config,"width")&&(b.isInt(this.config.width)?this.width=this.config.width+"px":"auto"===this.config.width?this.width="100%":b.includes(this.config.width,"%")&&(this.width=this.config.width));this.container=b.createElement("div",
{"class":"selectr-container"});this.config.customClass&&b.addClass(this.container,this.config.customClass);this.mobileDevice?b.addClass(this.container,"selectr-mobile"):b.addClass(this.container,"selectr-desktop");this.el.tabIndex=-1;this.config.nativeDropdown||this.mobileDevice?b.addClass(this.el,"selectr-visible"):b.addClass(this.el,"selectr-hidden");this.selected=b.createElement("div",{"class":"selectr-selected",disabled:this.disabled,tabIndex:0,"aria-expanded":!1});this.label=b.createElement(this.el.multiple?
"ul":"span",{"class":"selectr-label"});var a=b.createElement("div",{"class":"selectr-options-container"});this.tree=b.createElement("ul",{"class":"selectr-options",role:"tree","aria-hidden":!0,"aria-expanded":!1});this.notice=b.createElement("div",{"class":"selectr-notice"});this.el.setAttribute("aria-hidden",!0);this.disabled&&(this.el.disabled=!0);this.el.multiple&&(b.addClass(this.label,"selectr-tags"),b.addClass(this.container,"multiple"),this.tags=[],this.selectedValues=this.getSelectedProperties("value"),
this.selectedIndexes=this.getSelectedProperties("idx"));this.selected.appendChild(this.label);this.config.clearable&&(this.selectClear=b.createElement("button",{"class":"selectr-clear",type:"button"}),this.container.appendChild(this.selectClear),b.addClass(this.container,"clearable"));if(this.config.taggable){var c=b.createElement("li",{"class":"input-tag"});this.input=b.createElement("input",{"class":"selectr-tag-input",placeholder:this.config.tagPlaceholder,tagIndex:0,autocomplete:"off",autocorrect:"off",
autocapitalize:"off",spellcheck:"false",role:"textbox",type:"search"});c.appendChild(this.input);this.label.appendChild(c);b.addClass(this.container,"taggable");this.tagSeperators=[","];this.config.tagSeperators&&(this.tagSeperators=this.tagSeperators.concat(this.config.tagSeperators))}this.config.searchable&&(this.input=b.createElement("input",{"class":"selectr-input",tagIndex:-1,autocomplete:"off",autocorrect:"off",autocapitalize:"off",spellcheck:"false",role:"textbox",type:"search"}),this.inputClear=
b.createElement("button",{"class":"selectr-input-clear",type:"button"}),this.inputContainer=b.createElement("div",{"class":"selectr-input-container"}),this.inputContainer.appendChild(this.input),this.inputContainer.appendChild(this.inputClear),a.appendChild(this.inputContainer));a.appendChild(this.notice);a.appendChild(this.tree);this.items=[];this.options=[];this.el.options.length&&(this.options=[].slice.call(this.el.options));var e=!1,d=0;this.el.children.length&&b.each(this.el.children,function(a,
c){"OPTGROUP"===c.nodeName?(e=b.createElement("ul",{"class":"selectr-optgroup",role:"group",html:"<li class='selectr-optgroup--label'>"+c.label+"</li>"}),b.each(c.children,function(a,b){b.idx=d;e.appendChild(m.call(this,b,e));d++},this)):(c.idx=d,m.call(this,c),d++)},this);if(this.config.data&&Array.isArray(this.config.data)){this.data=[];var f=!1,h;e=!1;d=0;b.each(this.config.data,function(a,c){k(c,"children")?(f=b.createElement("optgroup",{label:c.text}),e=b.createElement("ul",{"class":"selectr-optgroup",
role:"group",html:"<li class='selectr-optgroup--label'>"+c.text+"</li>"}),b.each(c.children,function(a,b){h=new Option(b.text,b.value,!1,b.hasOwnProperty("selected")&&!0===b.selected);h.disabled=k(b,"disabled");this.options.push(h);f.appendChild(h);h.idx=d;e.appendChild(m.call(this,h,b));this.data[d]=b;d++},this),this.el.appendChild(f)):(h=new Option(c.text,c.value,!1,c.hasOwnProperty("selected")&&!0===c.selected),h.disabled=k(c,"disabled"),this.options.push(h),h.idx=d,m.call(this,h,c),this.data[d]=
c,d++)},this)}this.setSelected(!0);for(var g=this.navIndex=0;g<this.items.length;g++)if(c=this.items[g],!b.hasClass(c,"disabled")){b.addClass(c,"active");this.navIndex=g;break}this.requiresPagination&&(this.pageIndex=1,this.paginate());this.container.appendChild(this.selected);this.container.appendChild(a);this.placeEl=b.createElement("div",{"class":"selectr-placeholder"});this.setPlaceholder();this.selected.appendChild(this.placeEl);this.disabled&&this.disable();this.el.parentNode.insertBefore(this.container,
this.el);this.container.appendChild(this.el)},v=function(a){a=a||window.event;if(this.items.length&&this.opened&&b.includes([13,38,40],a.which)){a.preventDefault();if(13===a.which)return this.noResults||this.config.taggable&&0<this.input.value.length?!1:this.change(this.navIndex);var c=this.items[this.navIndex],e=this.navIndex;switch(a.which){case 38:var d=0;0<this.navIndex&&this.navIndex--;break;case 40:d=1,this.navIndex<this.items.length-1&&this.navIndex++}for(this.navigating=!0;b.hasClass(this.items[this.navIndex],
"disabled")||b.hasClass(this.items[this.navIndex],"excluded");){if(0<this.navIndex&&this.navIndex<this.items.length-1)d?this.navIndex++:this.navIndex--;else{this.navIndex=e;break}if(this.searching)if(this.navIndex>this.tree.lastElementChild.idx){this.navIndex=this.tree.lastElementChild.idx;break}else if(this.navIndex<this.tree.firstElementChild.idx){this.navIndex=this.tree.firstElementChild.idx;break}}a=b.rect(this.items[this.navIndex]);d?(0===this.navIndex?this.tree.scrollTop=0:a.top+a.height>this.optsRect.top+
this.optsRect.height&&(this.tree.scrollTop+=a.top+a.height-(this.optsRect.top+this.optsRect.height)),this.navIndex===this.tree.childElementCount-1&&this.requiresPagination&&r.call(this)):0===this.navIndex?this.tree.scrollTop=0:0>a.top-this.optsRect.top&&(this.tree.scrollTop+=a.top-this.optsRect.top);c&&b.removeClass(c,"active");b.addClass(this.items[this.navIndex],"active")}else this.navigating=!1},w=function(a){var c=this,e=document.createDocumentFragment(),d=this.options[a.idx],f=this.data?this.data[a.idx]:
d;f=this.customSelected?this.config.renderSelection(f):d.textContent;f=b.createElement("li",{"class":"selectr-tag",html:f});var h=b.createElement("button",{"class":"selectr-tag-remove",type:"button"});f.appendChild(h);f.idx=a.idx;f.tag=d.value;this.tags.push(f);if(this.config.sortSelected){a=this.tags.slice();var g=function(a,b){a.replace(/(\d+)|(\D+)/g,function(a,d,c){b.push([d||Infinity,c||""])})};a.sort(function(a,b){var d=[],e=[];if(!0===c.config.sortSelected){var f=a.tag;var h=b.tag}else"text"===
c.config.sortSelected&&(f=a.textContent,h=b.textContent);g(f,d);for(g(h,e);d.length&&e.length;)if(f=d.shift(),h=e.shift(),f=f[0]-h[0]||f[1].localeCompare(h[1]))return f;return d.length-e.length});b.each(a,function(a,b){e.appendChild(b)});this.label.innerHTML=""}else e.appendChild(f);this.config.taggable?this.label.insertBefore(e,this.input.parentNode):this.label.appendChild(e)},x=function(a){var c=!1;b.each(this.tags,function(b,d){d.idx===a.idx&&(c=d)},this);c&&(this.label.removeChild(c),this.tags.splice(this.tags.indexOf(c),
1))},r=function(){var a=this.tree;if(a.scrollTop>=a.scrollHeight-a.offsetHeight&&this.pageIndex<this.pages.length){var c=document.createDocumentFragment();b.each(this.pages[this.pageIndex],function(a,b){n(b,c,this.customOption)},this);a.appendChild(c);this.pageIndex++;this.emit("selectr.paginate",{items:this.items.length,total:this.data.length,page:this.pageIndex,pages:this.pages.length})}},q=function(){if(this.config.searchable||this.config.taggable)this.input.value=null,this.searching=!1,this.config.searchable&&
b.removeClass(this.inputContainer,"active"),b.hasClass(this.container,"notice")&&(b.removeClass(this.container,"notice"),b.addClass(this.container,"open"),this.input.focus()),b.each(this.items,function(a,c){b.removeClass(c,"excluded");this.customOption||(c.innerHTML=c.textContent)},this)};g=function(a,b){this.defaultConfig={defaultSelected:!0,width:"auto",disabled:!1,searchable:!0,clearable:!1,sortSelected:!1,allowDeselect:!1,closeOnScroll:!1,nativeDropdown:!1,nativeKeyboard:!1,placeholder:"Select an option...",
taggable:!1,tagPlaceholder:"Enter a tag...",messages:{noResults:"No results.",noOptions:"No options available.",maxSelections:"A maximum of {max} items can be selected.",tagDuplicate:"That tag is already in use."}};if(!a)throw Error("You must supply either a HTMLSelectElement or a CSS3 selector string.");this.el=a;"string"===typeof a&&(this.el=document.querySelector(a));if(null===this.el)throw Error("The element you passed to Selectr can not be found.");if("select"!==this.el.nodeName.toLowerCase())throw Error("The element you passed to Selectr is not a HTMLSelectElement.");
this.render(b)};g.prototype.render=function(a){if(!this.rendered){this.el.selectr=this;this.config=b.extend(this.defaultConfig,a);this.originalType=this.el.type;this.originalIndex=this.el.tabIndex;this.defaultSelected=[];this.originalOptionCount=this.el.options.length;if(this.config.multiple||this.config.taggable)this.el.multiple=!0;this.disabled=k(this.config,"disabled");this.opened=!1;this.config.taggable&&(this.config.searchable=!1);this.mobileDevice=this.navigating=!1;/Android|webOS|iPhone|iPad|BlackBerry|Windows Phone|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent)&&
(this.mobileDevice=!0);this.customOption=this.config.hasOwnProperty("renderOption")&&"function"===typeof this.config.renderOption;this.customSelected=this.config.hasOwnProperty("renderSelection")&&"function"===typeof this.config.renderSelection;this.supportsEventPassiveOption=this.detectEventPassiveOption();l.mixin(this);u.call(this);this.bindEvents();this.update();this.optsRect=b.rect(this.tree);this.rendered=!0;this.el.multiple||(this.el.selectedIndex=this.selectedIndex);var c=this;setTimeout(function(){c.emit("selectr.init")},
20)}};g.prototype.getSelected=function(){return this.el.querySelectorAll("option:checked")};g.prototype.getSelectedProperties=function(a){var b=this.getSelected();return[].slice.call(b).map(function(b){return b[a]}).filter(function(a){return null!==a&&void 0!==a})};g.prototype.detectEventPassiveOption=function(){var a=!1;try{var b=Object.defineProperty({},"passive",{get:function(){a=!0}});window.addEventListener("test",null,b)}catch(e){}return a};g.prototype.bindEvents=function(){var a=this;this.events=
{};this.events.dismiss=t.bind(this);this.events.navigate=v.bind(this);this.events.reset=this.reset.bind(this);if(this.config.nativeDropdown||this.mobileDevice){this.container.addEventListener("touchstart",function(b){b.changedTouches[0].target===a.el&&a.toggle()},this.supportsEventPassiveOption?{passive:!0}:!1);this.container.addEventListener("click",function(b){b.target===a.el&&a.toggle()});var c=function(a,b){for(var d=[],c=a.slice(0),e,f=0;f<b.length;f++)e=c.indexOf(b[f]),-1<e?c.splice(e,1):d.push(b[f]);
return[d,c]};this.el.addEventListener("change",function(d){a.el.multiple?(d=a.getSelectedProperties("idx"),d=c(a.selectedIndexes,d),b.each(d[0],function(b,d){a.select(d)},a),b.each(d[1],function(b,d){a.deselect(d)},a)):-1<a.el.selectedIndex&&a.select(a.el.selectedIndex)})}this.container.addEventListener("keydown",function(b){"Escape"===b.key&&a.close();"Enter"===b.key&&a.selected===document.activeElement&&"undefined"!==typeof a.el.form.submit&&a.el.form.submit();" "!==b.key&&"ArrowUp"!==b.key&&"ArrowDown"!==
b.key||a.selected!==document.activeElement||(setTimeout(function(){a.toggle()},200),a.config.nativeDropdown&&setTimeout(function(){a.el.focus()},200))});this.selected.addEventListener("click",function(b){a.disabled||a.toggle();b.preventDefault()});if(this.config.nativeKeyboard){var e="";this.selected.addEventListener("keydown",function(b){if(!(a.disabled||a.selected!==document.activeElement||b.altKey||b.ctrlKey||b.metaKey))if(" "===b.key||!a.opened&&-1<["Enter","ArrowUp","ArrowDown"].indexOf(b.key))a.toggle(),
b.preventDefault(),b.stopPropagation();else if(2>=b.key.length&&String[String.fromCodePoint?"fromCodePoint":"fromCharCode"](b.key[String.codePointAt?"codePointAt":"charCodeAt"](0))===b.key){if(a.config.multiple)a.open(),a.config.searchable&&(a.input.value=b.key,a.input.focus(),a.search(null,!0));else{e+=b.key;var c=a.search(e,!0);c&&c.length&&(a.clear(),a.setValue(c[0].value));setTimeout(function(){e=""},1E3)}b.preventDefault();b.stopPropagation()}});this.container.addEventListener("keyup",function(b){a.opened&&
"Escape"===b.key&&(a.close(),b.stopPropagation(),a.selected.focus())})}this.label.addEventListener("click",function(c){b.hasClass(c.target,"selectr-tag-remove")&&a.deselect(c.target.parentNode.idx)});this.selectClear&&this.selectClear.addEventListener("click",this.clear.bind(this));this.tree.addEventListener("mousedown",function(a){a.preventDefault()});this.tree.addEventListener("click",function(c){var d=b.closest(c.target,function(a){return a&&b.hasClass(a,"selectr-option")});d&&!b.hasClass(d,"disabled")&&
(b.hasClass(d,"selected")?(a.el.multiple||!a.el.multiple&&a.config.allowDeselect)&&a.deselect(d.idx):a.select(d.idx),a.opened&&!a.el.multiple&&a.close());c.preventDefault();c.stopPropagation()});this.tree.addEventListener("mouseover",function(c){b.hasClass(c.target,"selectr-option")&&!b.hasClass(c.target,"disabled")&&(b.removeClass(a.items[a.navIndex],"active"),b.addClass(c.target,"active"),a.navIndex=[].slice.call(a.items).indexOf(c.target))});this.config.searchable&&(this.input.addEventListener("focus",
function(b){a.searching=!0}),this.input.addEventListener("blur",function(b){a.searching=!1}),this.input.addEventListener("keyup",function(c){a.search();a.config.taggable||(this.value.length?b.addClass(this.parentNode,"active"):b.removeClass(this.parentNode,"active"))}),this.inputClear.addEventListener("click",function(b){a.input.value=null;q.call(a);a.tree.childElementCount||p.call(a)}));this.config.taggable&&this.input.addEventListener("keyup",function(c){a.search();if(a.config.taggable&&this.value.length){var d=
this.value.trim();if(13===c.which||b.includes(a.tagSeperators,c.key))b.each(a.tagSeperators,function(a,b){d=d.replace(b,"")}),a.add({value:d,text:d,selected:!0},!0)?(a.close(),q.call(a)):(this.value="",a.setMessage(a.config.messages.tagDuplicate))}});this.update=b.debounce(function(){a.opened&&a.config.closeOnScroll&&a.close();a.width&&(a.container.style.width=a.width);a.invert()},50);this.requiresPagination&&(this.paginateItems=b.debounce(function(){r.call(this)},50),this.tree.addEventListener("scroll",
this.paginateItems.bind(this)));document.addEventListener("click",this.events.dismiss);window.addEventListener("keydown",this.events.navigate);window.addEventListener("resize",this.update);window.addEventListener("scroll",this.update);this.on("selectr.destroy",function(){document.removeEventListener("click",this.events.dismiss);window.removeEventListener("keydown",this.events.navigate);window.removeEventListener("resize",this.update);window.removeEventListener("scroll",this.update)});this.el.form&&
(this.el.form.addEventListener("reset",this.events.reset),this.on("selectr.destroy",function(){this.el.form.removeEventListener("reset",this.events.reset)}))};g.prototype.setSelected=function(a){this.config.data||this.el.multiple||!this.el.options.length||(0!==this.el.selectedIndex||this.el.options[0].defaultSelected||this.config.defaultSelected||(this.el.selectedIndex=-1),this.selectedIndex=this.el.selectedIndex,-1<this.selectedIndex&&this.select(this.selectedIndex));this.config.multiple&&"select-one"===
this.originalType&&!this.config.data&&this.el.options[0].selected&&!this.el.options[0].defaultSelected&&(this.el.options[0].selected=!1);b.each(this.options,function(a,b){b.selected&&b.defaultSelected&&this.select(b.idx)},this);this.config.selectedValue&&this.setValue(this.config.selectedValue);if(this.config.data){!this.el.multiple&&this.config.defaultSelected&&0>this.el.selectedIndex&&this.select(0);var c=0;b.each(this.config.data,function(a,d){k(d,"children")?b.each(d.children,function(a,b){b.hasOwnProperty("selected")&&
!0===b.selected&&this.select(c);c++},this):(d.hasOwnProperty("selected")&&!0===d.selected&&this.select(c),c++)},this)}};g.prototype.destroy=function(){this.rendered&&(this.emit("selectr.destroy"),"select-one"===this.originalType&&(this.el.multiple=!1),this.config.data&&(this.el.innerHTML=""),b.removeClass(this.el,"selectr-hidden"),this.container.parentNode.replaceChild(this.el,this.container),this.rendered=!1,delete this.el.selectr)};g.prototype.change=function(a){var c=this.items[a],e=this.options[a];
e.disabled||(e.selected&&b.hasClass(c,"selected")?this.deselect(a):this.select(a),this.opened&&!this.el.multiple&&this.close())};g.prototype.select=function(a){var c=this.items[a],e=[].slice.call(this.el.options),d=this.options[a];if(this.el.multiple){if(b.includes(this.selectedIndexes,a))return!1;if(this.config.maxSelections&&this.tags.length===this.config.maxSelections)return this.setMessage(this.config.messages.maxSelections.replace("{max}",this.config.maxSelections),!0),!1;this.selectedValues.push(d.value);
this.selectedIndexes.push(a);w.call(this,c)}else{var f=this.data?this.data[a]:d;this.label.innerHTML=this.customSelected?this.config.renderSelection(f):d.textContent;this.selectedValue=d.value;this.selectedIndex=a;b.each(this.options,function(c,d){var e=this.items[c];c!==a&&(e&&b.removeClass(e,"selected"),d.selected=!1,d.removeAttribute("selected"))},this)}b.includes(e,d)||this.el.add(d);c.setAttribute("aria-selected",!0);b.addClass(c,"selected");b.addClass(this.container,"has-selected");d.selected=
!0;d.setAttribute("selected","");this.emit("selectr.change",d);this.emit("selectr.select",d);"createEvent"in document?(c=document.createEvent("HTMLEvents"),c.initEvent("change",!0,!0),this.el.dispatchEvent(c)):this.el.fireEvent("onchange")};g.prototype.deselect=function(a,c){var e=this.items[a],d=this.options[a];if(this.el.multiple){var f=this.selectedIndexes.indexOf(a);this.selectedIndexes.splice(f,1);f=this.selectedValues.indexOf(d.value);this.selectedValues.splice(f,1);x.call(this,e);this.tags.length||
b.removeClass(this.container,"has-selected")}else{if(!c&&!this.config.clearable&&!this.config.allowDeselect)return!1;this.label.innerHTML="";this.selectedValue=null;this.el.selectedIndex=this.selectedIndex=-1;b.removeClass(this.container,"has-selected")}this.items[a].setAttribute("aria-selected",!1);b.removeClass(this.items[a],"selected");d.selected=!1;d.removeAttribute("selected");this.emit("selectr.change",null);this.emit("selectr.deselect",d);"createEvent"in document?(e=document.createEvent("HTMLEvents"),
e.initEvent("change",!0,!0),this.el.dispatchEvent(e)):this.el.fireEvent("onchange")};g.prototype.setValue=function(a){var c=Array.isArray(a);c||(a=a.toString().trim());if(!this.el.multiple&&c)return!1;b.each(this.options,function(b,d){(c&&-1<a.indexOf(d.value)||d.value===a)&&this.change(d.idx)},this)};g.prototype.getValue=function(a,c){if(this.el.multiple)if(a){if(this.selectedIndexes.length){var e={values:[]};b.each(this.selectedIndexes,function(a,b){var c=this.options[b];e.values[a]={value:c.value,
text:c.textContent}},this)}}else e=this.selectedValues.slice();else if(a){var d=this.options[this.selectedIndex];e={value:d.value,text:d.textContent}}else e=this.selectedValue;a&&c&&(e=JSON.stringify(e));return e};g.prototype.add=function(a,c){if(a){this.data=this.data||[];this.items=this.items||[];this.options=this.options||[];if(Array.isArray(a))b.each(a,function(a,b){this.add(b,c)},this);else if("[object Object]"===Object.prototype.toString.call(a)){if(c){var e=!1;b.each(this.options,function(b,
c){c.value.toLowerCase()===a.value.toLowerCase()&&(e=!0)});if(e)return!1}var d=b.createElement("option",a);this.data.push(a);this.options.push(d);d.idx=0<this.options.length?this.options.length-1:0;m.call(this,d);a.selected&&this.select(d.idx);this.setPlaceholder();return d}this.config.pagination&&this.paginate();return!0}};g.prototype.remove=function(a){var c=[];Array.isArray(a)?b.each(a,function(a,e){b.isInt(e)?c.push(this.getOptionByIndex(e)):"string"===typeof e&&c.push(this.getOptionByValue(e))},
this):b.isInt(a)?c.push(this.getOptionByIndex(a)):"string"===typeof a&&c.push(this.getOptionByValue(a));if(c.length){var e;b.each(c,function(a,c){e=c.idx;this.el.remove(c);this.options.splice(e,1);var d=this.items[e].parentNode;d&&d.removeChild(this.items[e]);this.items.splice(e,1);b.each(this.options,function(a,b){b.idx=a;this.items[a].idx=a},this)},this);this.setPlaceholder();this.config.pagination&&this.paginate()}};g.prototype.removeAll=function(){this.clear(!0);b.each(this.el.options,function(a,
b){this.el.remove(b)},this);b.truncate(this.tree);this.items=[];this.options=[];this.data=[];this.navIndex=0;this.requiresPagination&&(this.requiresPagination=!1,this.pageIndex=1,this.pages=[]);this.setPlaceholder()};g.prototype.search=function(a,c){if(!this.navigating){var e=!1;a||(a=this.input.value,e=!0,this.removeMessage(),b.truncate(this.tree));var d=[],f=document.createDocumentFragment();a=a.trim().toLowerCase();if(0<a.length){var g=c?b.startsWith:b.includes;b.each(this.options,function(c,h){var k=
this.items[h.idx];if(g(h.textContent.trim().toLowerCase(),a)&&!h.disabled){if(d.push({text:h.textContent,value:h.value}),e&&(n(k,f,this.customOption),b.removeClass(k,"excluded"),!this.customOption)){var l=(l=(new RegExp(a,"i")).exec(h.textContent))?h.textContent.replace(l[0],"<span class='selectr-match'>"+l[0]+"</span>"):!1;k.innerHTML=l}}else e&&b.addClass(k,"excluded")},this);if(e){if(f.childElementCount){var k=this.items[this.navIndex],l=f.querySelector(".selectr-option:not(.excluded)");this.noResults=
!1;b.removeClass(k,"active");this.navIndex=l.idx;b.addClass(l,"active")}else this.config.taggable||(this.noResults=!0,this.setMessage(this.config.messages.noResults));this.tree.appendChild(f)}}else p.call(this);return d}};g.prototype.toggle=function(){this.disabled||(this.opened?this.close():this.open())};g.prototype.open=function(){var a=this;if(!this.options.length)return!1;this.opened||this.emit("selectr.open");this.opened=!0;this.mobileDevice||this.config.nativeDropdown?(b.addClass(this.container,
"native-open"),this.config.data&&b.each(this.options,function(a,b){this.el.add(b)},this)):(b.addClass(this.container,"open"),p.call(this),this.invert(),this.tree.scrollTop=0,b.removeClass(this.container,"notice"),this.selected.setAttribute("aria-expanded",!0),this.tree.setAttribute("aria-hidden",!1),this.tree.setAttribute("aria-expanded",!0),this.config.searchable&&!this.config.taggable&&setTimeout(function(){a.input.focus();a.input.tabIndex=0},10))};g.prototype.close=function(){this.opened&&this.emit("selectr.close");
this.navigating=this.opened=!1;if(this.mobileDevice||this.config.nativeDropdown)b.removeClass(this.container,"native-open");else{var a=b.hasClass(this.container,"notice");this.config.searchable&&!a&&(this.input.blur(),this.input.tabIndex=-1,this.searching=!1);a&&(b.removeClass(this.container,"notice"),this.notice.textContent="");b.removeClass(this.container,"open");b.removeClass(this.container,"native-open");this.selected.setAttribute("aria-expanded",!1);this.tree.setAttribute("aria-hidden",!0);this.tree.setAttribute("aria-expanded",
!1);b.truncate(this.tree);q.call(this);this.selected.focus()}};g.prototype.enable=function(){this.disabled=!1;this.el.disabled=!1;this.selected.tabIndex=this.originalIndex;this.el.multiple&&b.each(this.tags,function(a,b){b.lastElementChild.tabIndex=0});b.removeClass(this.container,"selectr-disabled")};g.prototype.disable=function(a){a||(this.el.disabled=!0);this.selected.tabIndex=-1;this.el.multiple&&b.each(this.tags,function(a,b){b.lastElementChild.tabIndex=-1});this.disabled=!0;b.addClass(this.container,
"selectr-disabled")};g.prototype.reset=function(){this.disabled||(this.clear(),this.setSelected(!0),b.each(this.defaultSelected,function(a,b){this.select(b)},this),this.emit("selectr.reset"))};g.prototype.clear=function(a){this.el.multiple?this.selectedIndexes.length&&(a=this.selectedIndexes.slice(),b.each(a,function(a,b){this.deselect(b)},this)):-1<this.selectedIndex&&this.deselect(this.selectedIndex,a);this.emit("selectr.clear")};g.prototype.serialise=function(a){var c=[];b.each(this.options,function(a,
b){var d={value:b.value,text:b.textContent};b.selected&&(d.selected=!0);b.disabled&&(d.disabled=!0);c[a]=d});return a?JSON.stringify(c):c};g.prototype.serialize=function(a){return this.serialise(a)};g.prototype.setPlaceholder=function(a){a=a||this.config.placeholder||this.el.getAttribute("placeholder");this.options.length||(a=this.config.messages.noOptions);this.placeEl.innerHTML=a};g.prototype.paginate=function(){if(this.items.length){var a=this;return this.pages=this.items.map(function(b,e){return 0===
e%a.config.pagination?a.items.slice(e,e+a.config.pagination):null}).filter(function(a){return a})}};g.prototype.setMessage=function(a,c){c&&this.close();b.addClass(this.container,"notice");this.notice.textContent=a};g.prototype.removeMessage=function(){b.removeClass(this.container,"notice");this.notice.innerHTML=""};g.prototype.invert=function(){var a=b.rect(this.selected);a.top+a.height+this.tree.parentNode.offsetHeight>window.innerHeight?(b.addClass(this.container,"inverted"),this.isInverted=!0):
(b.removeClass(this.container,"inverted"),this.isInverted=!1);this.optsRect=b.rect(this.tree)};g.prototype.getOptionByIndex=function(a){return this.options[a]};g.prototype.getOptionByValue=function(a){for(var b=!1,e=0,d=this.options.length;e<d;e++)if(this.options[e].value.trim()===a.toString().trim()){b=this.options[e];break}return b};return g});
}

function mSelectr()
{
/*!
 * Selectr 2.4.13
 * http://mobius.ovh/docs/selectr
 *
 * Released under the MIT license
 */
(function(root, factory) {
    var plugin = "Selectr";

    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof exports === "object") {
        module.exports = factory(plugin);
    } else {
        root[plugin] = factory(plugin);
    }
}(this, function(plugin) {
    'use strict';

    /**
     * Event Emitter
     */
    var Events = function() {};

    /**
     * Event Prototype
     * @type {Object}
     */
    Events.prototype = {
        /**
         * Add custom event listener
         * @param  {String} event Event type
         * @param  {Function} func   Callback
         * @return {Void}
         */
        on: function(event, func) {
            this._events = this._events || {};
            this._events[event] = this._events[event] || [];
            this._events[event].push(func);
        },

        /**
         * Remove custom event listener
         * @param  {String} event Event type
         * @param  {Function} func   Callback
         * @return {Void}
         */
        off: function(event, func) {
            this._events = this._events || {};
            if (event in this._events === false) return;
            this._events[event].splice(this._events[event].indexOf(func), 1);
        },

        /**
         * Fire a custom event
         * @param  {String} event Event type
         * @return {Void}
         */
        emit: function(event /* , args... */ ) {
            this._events = this._events || {};
            if (event in this._events === false) return;
            for (var i = 0; i < this._events[event].length; i++) {
                this._events[event][i].apply(this, Array.prototype.slice.call(arguments, 1));
            }
        }
    };

    /**
     * Event mixin
     * @param  {Object} obj
     * @return {Object}
     */
    Events.mixin = function(obj) {
        var props = ['on', 'off', 'emit'];
        for (var i = 0; i < props.length; i++) {
            if (typeof obj === 'function') {
                obj.prototype[props[i]] = Events.prototype[props[i]];
            } else {
                obj[props[i]] = Events.prototype[props[i]];
            }
        }
        return obj;
    };

    /**
     * Helpers
     * @type {Object}
     */
    var util = {
      escapeRegExp: function(str) {
        // source from lodash 3.0.0
            var _reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
            var _reHasRegExpChar = new RegExp(_reRegExpChar.source);
            return (str && _reHasRegExpChar.test(str)) ? str.replace(_reRegExpChar, '\\$&') : str;
        },
        extend: function(src, props) {
                    for (var prop in props) {
                            if (props.hasOwnProperty(prop)) {
                                    var val = props[prop];
                                    if (val && Object.prototype.toString.call(val) === "[object Object]") {
                                            src[prop] = src[prop] || {};
                                            util.extend(src[prop], val);
                                    } else {
                                            src[prop] = val;
                                    }
                            }
                    }
                    return src;
        },
        each: function(a, b, c) {
            if ("[object Object]" === Object.prototype.toString.call(a)) {
                for (var d in a) {
                    if (Object.prototype.hasOwnProperty.call(a, d)) {
                        b.call(c, d, a[d], a);
                    }
                }
            } else {
                for (var e = 0, f = a.length; e < f; e++) {
                    b.call(c, e, a[e], a);
                }
            }
        },
        createElement: function(e, a) {
            var d = document,
                el = d.createElement(e);
            if (a && "[object Object]" === Object.prototype.toString.call(a)) {
                var i;
                for (i in a)
                    if (i in el) el[i] = a[i];
                    else if ("html" === i) el.innerHTML = a[i];
                    else el.setAttribute(i, a[i]);
            }
            return el;
        },
        hasClass: function(a, b) {
            if (a)
                return a.classList ? a.classList.contains(b) : !!a.className && !!a.className.match(new RegExp("(\\s|^)" + b + "(\\s|$)"));
        },
        addClass: function(a, b) {
            if (!util.hasClass(a, b)) {
                if (a.classList) {
                    a.classList.add(b);
                } else {
                    a.className = a.className.trim() + " " + b;
                }
            }
        },
        removeClass: function(a, b) {
            if (util.hasClass(a, b)) {
                if (a.classList) {
                    a.classList.remove(b);
                } else {
                    a.className = a.className.replace(new RegExp("(^|\\s)" + b.split(" ").join("|") + "(\\s|$)", "gi"), " ");
                }
            }
        },
        closest: function(el, fn) {
            return el && el !== document.body && (fn(el) ? el : util.closest(el.parentNode, fn));
        },
        isInt: function(val) {
            return typeof val === 'number' && isFinite(val) && Math.floor(val) === val;
        },
        debounce: function(a, b, c) {
            var d;
            return function() {
                var e = this,
                    f = arguments,
                    g = function() {
                        d = null;
                        if (!c) a.apply(e, f);
                    },
                    h = c && !d;
                clearTimeout(d);
                d = setTimeout(g, b);
                if (h) {
                    a.apply(e, f);
                }
            };
        },
        rect: function(el, abs) {
            var w = window;
            var r = el.getBoundingClientRect();
            var x = abs ? w.pageXOffset : 0;
            var y = abs ? w.pageYOffset : 0;

            return {
                bottom: r.bottom + y,
                height: r.height,
                left: r.left + x,
                right: r.right + x,
                top: r.top + y,
                width: r.width
            };
        },
        includes: function(a, b) {
            return a.indexOf(b) > -1;
        },
        startsWith: function(a, b) {
            return a.substr( 0, b.length ) === b;
        },
        truncate: function(el) {
            while (el.firstChild) {
                el.removeChild(el.firstChild);
            }
        }
    };


    function isset(obj, prop) {
        return obj.hasOwnProperty(prop) && (obj[prop] === true || obj[prop].length);
    }

    /**
     * Append an item to the list
     * @param  {Object} item
     * @param  {Object} custom
     * @return {Void}
     */
    function appendItem(item, parent, custom) {
        if (item.parentNode) {
            if (!item.parentNode.parentNode) {
                parent.appendChild(item.parentNode);
            }
        } else {
            parent.appendChild(item);
        }

        util.removeClass(item, "excluded");
        if (!custom) {
            // remove any <span> highlighting, without xss
            item.textContent = item.textContent;
        }
    }

    /**
     * Render the item list
     * @return {Void}
     */
    var render = function() {
        if (this.items.length) {
            var f = document.createDocumentFragment();

            if (this.config.pagination) {
                var pages = this.pages.slice(0, this.pageIndex);

                util.each(pages, function(i, items) {
                    util.each(items, function(j, item) {
                        appendItem(item, f, this.customOption);
                    }, this);
                }, this);
            } else {
                util.each(this.items, function(i, item) {
                    appendItem(item, f, this.customOption);
                }, this);
            }

            // highlight first selected option if any; first option otherwise
            if (f.childElementCount) {
                util.removeClass(this.items[this.navIndex], "active");
                this.navIndex = (
                    f.querySelector(".selectr-option.selected") ||
                    f.querySelector(".selectr-option")
                ).idx;
                util.addClass(this.items[this.navIndex], "active");
            }

            this.tree.appendChild(f);
        }
    };

    /**
     * Dismiss / close the dropdown
     * @param  {obj} e
     * @return {void}
     */
    var dismiss = function(e) {
        var target = e.target;
        if (!this.container.contains(target) && (this.opened || util.hasClass(this.container, "notice"))) {
            this.close();
        }
    };

    /**
     * Build a list item from the HTMLOptionElement
     * @param  {int} i      HTMLOptionElement index
     * @param  {HTMLOptionElement} option
     * @param  {bool} group  Has parent optgroup
     * @return {void}
     */
    var createItem = function(option, data) {
        data = data || option;
        var elementData =  {
            class: "selectr-option",
            role: "treeitem",
            "aria-selected": false
        };

        if(this.customOption){
            elementData.html = this.config.renderOption(data); // asume xss prevention in custom render function
        } else{
            elementData.textContent = option.textContent; // treat all as plain text
        }
        var opt = util.createElement("li",elementData);


        opt.idx = option.idx;

        this.items.push(opt);

        if (option.defaultSelected) {
            this.defaultSelected.push(option.idx);
        }

        if (option.disabled) {
            opt.disabled = true;
            util.addClass(opt, "disabled");
        }

        return opt;
    };

    /**
     * Build the container
     * @return {Void}
     */
    var build = function() {

        this.requiresPagination = this.config.pagination && this.config.pagination > 0;

        // Set width
        if (isset(this.config, "width")) {
            if (util.isInt(this.config.width)) {
                this.width = this.config.width + "px";
            } else {
                if (this.config.width === "auto") {
                    this.width = "100%";
                } else if (util.includes(this.config.width, "%")) {
                    this.width = this.config.width;
                }
            }
        }

        this.container = util.createElement("div", {
            class: "selectr-container"
        });

        // Custom className
        if (this.config.customClass) {
            util.addClass(this.container, this.config.customClass);
        }

        // Mobile device
        if (this.mobileDevice) {
            util.addClass(this.container, "selectr-mobile");
        } else {
            util.addClass(this.container, "selectr-desktop");
        }

        // Hide the HTMLSelectElement and prevent focus
        this.el.tabIndex = -1;

        // Native dropdown
        if (this.config.nativeDropdown || this.mobileDevice) {
            util.addClass(this.el, "selectr-visible");
        } else {
            util.addClass(this.el, "selectr-hidden");
        }

        this.selected = util.createElement("div", {
            class: "selectr-selected",
            disabled: this.disabled,
            tabIndex: 0,
            "aria-expanded": false
        });

        this.label = util.createElement(this.el.multiple ? "ul" : "span", {
            class: "selectr-label"
        });

        var dropdown = util.createElement("div", {
            class: "selectr-options-container"
        });

        this.tree = util.createElement("ul", {
            class: "selectr-options",
            role: "tree",
            "aria-hidden": true,
            "aria-expanded": false
        });

        this.notice = util.createElement("div", {
            class: "selectr-notice"
        });

        this.el.setAttribute("aria-hidden", true);

        if (this.disabled) {
            this.el.disabled = true;
        }

        if (this.el.multiple) {
            util.addClass(this.label, "selectr-tags");
            util.addClass(this.container, "multiple");

            // Collection of tags
            this.tags = [];

            // Collection of selected values
            // #93 defaultSelected = false did not work as expected
            this.selectedValues = (this.config.defaultSelected) ? this.getSelectedProperties('value') : [];

            // Collection of selected indexes
            this.selectedIndexes = this.getSelectedProperties('idx');
        } else {
            // #93 defaultSelected = false did not work as expected
            // these values were undefined
            this.selectedValue = null;
            this.selectedIndex = -1;
        }

        this.selected.appendChild(this.label);

        if (this.config.clearable) {
            this.selectClear = util.createElement("button", {
                class: "selectr-clear",
                type: "button"
            });

            this.container.appendChild(this.selectClear);

            util.addClass(this.container, "clearable");
        }

        if (this.config.taggable) {
            var li = util.createElement('li', {
                class: 'input-tag'
            });
            this.input = util.createElement("input", {
                class: "selectr-tag-input",
                placeholder: this.config.tagPlaceholder,
                tagIndex: 0,
                autocomplete: "off",
                autocorrect: "off",
                autocapitalize: "off",
                spellcheck: "false",
                role: "textbox",
                type: "search"
            });

            li.appendChild(this.input);
            this.label.appendChild(li);
            util.addClass(this.container, "taggable");

            this.tagSeperators = [","];
            if (this.config.tagSeperators) {
                this.tagSeperators = this.tagSeperators.concat(this.config.tagSeperators);
                var _aTempEscapedSeperators = [];
                for(var _nTagSeperatorStepCount = 0; _nTagSeperatorStepCount < this.tagSeperators.length; _nTagSeperatorStepCount++){
                    _aTempEscapedSeperators.push(util.escapeRegExp(this.tagSeperators[_nTagSeperatorStepCount]));
                }
                this.tagSeperatorsRegex = new RegExp(_aTempEscapedSeperators.join('|'),'i');
            } else {
                this.tagSeperatorsRegex = new RegExp(',','i');
            }
        }

        if (this.config.searchable) {
            this.input = util.createElement("input", {
                class: "selectr-input",
                tagIndex: -1,
                autocomplete: "off",
                autocorrect: "off",
                autocapitalize: "off",
                spellcheck: "false",
                role: "textbox",
                type: "search",
                placeholder: this.config.searchPlaceholder || this.config.messages.searchPlaceholder
            });
            this.inputClear = util.createElement("button", {
                class: "selectr-input-clear",
                type: "button"
            });
            this.inputContainer = util.createElement("div", {
                class: "selectr-input-container"
            });

            this.inputContainer.appendChild(this.input);
            this.inputContainer.appendChild(this.inputClear);
            dropdown.appendChild(this.inputContainer);
        }

        dropdown.appendChild(this.notice);
        dropdown.appendChild(this.tree);

        // List of items for the dropdown
        this.items = [];

        // Establish options
        this.options = [];

        // Check for options in the element
        if (this.el.options.length) {
            this.options = [].slice.call(this.el.options);
        }

        // Element may have optgroups so
        // iterate element.children instead of element.options
        var group = false,
            j = 0;
        if (this.el.children.length) {
            util.each(this.el.children, function(i, element) {
                if (element.nodeName === "OPTGROUP") {

                    group = util.createElement("ul", {
                        class: "selectr-optgroup",
                        role: "group",
                        html: "<li class='selectr-optgroup--label'>" + element.label + "</li>"
                    });

                    util.each(element.children, function(x, el) {
                        el.idx = j;
                        group.appendChild(createItem.call(this, el, group));
                        j++;
                    }, this);
                } else {
                    element.idx = j;
                    createItem.call(this, element);
                    j++;
                }
            }, this);
        }

        // Options defined by the data option
        if (this.config.data && Array.isArray(this.config.data)) {
            this.data = [];
            var optgroup = false,
                option;

            group = false;
            j = 0;

            util.each(this.config.data, function(i, opt) {
                // Check for group options
                if (isset(opt, "children")) {
                    optgroup = util.createElement("optgroup", {
                        label: opt.text
                    });

                    group = util.createElement("ul", {
                        class: "selectr-optgroup",
                        role: "group",
                        html: "<li class='selectr-optgroup--label'>" + opt.text + "</li>"
                    });

                    util.each(opt.children, function(x, data) {
                        option = new Option(data.text, data.value, false, data.hasOwnProperty("selected") && data.selected === true);

                        option.disabled = isset(data, "disabled");

                        this.options.push(option);

                        optgroup.appendChild(option);

                        option.idx = j;

                        group.appendChild(createItem.call(this, option, data));

                        this.data[j] = data;

                        j++;
                    }, this);

                    this.el.appendChild(optgroup);
                } else {
                    option = new Option(opt.text, opt.value, false, opt.hasOwnProperty("selected") && opt.selected === true);

                    option.disabled = isset(opt, "disabled");

                    this.options.push(option);

                    option.idx = j;

                    createItem.call(this, option, opt);

                    this.data[j] = opt;

                    j++;
                }
            }, this);
        }

        this.setSelected(true);

        var first;
        this.navIndex = 0;
        for (var i = 0; i < this.items.length; i++) {
            first = this.items[i];

            if (!util.hasClass(first, "disabled")) {

                util.addClass(first, "active");
                this.navIndex = i;
                break;
            }
        }

        // Check for pagination / infinite scroll
        if (this.requiresPagination) {
            this.pageIndex = 1;

            // Create the pages
            this.paginate();
        }

        this.container.appendChild(this.selected);
        this.container.appendChild(dropdown);

        this.placeEl = util.createElement("div", {
            class: "selectr-placeholder"
        });

        // Set the placeholder
        this.setPlaceholder();

        this.selected.appendChild(this.placeEl);

        // Disable if required
        if (this.disabled) {
            this.disable();
        }

        this.el.parentNode.insertBefore(this.container, this.el);
        this.container.appendChild(this.el);
    };

    /**
     * Navigate through the dropdown
     * @param  {obj} e
     * @return {void}
     */
    var navigate = function(e) {
        e = e || window.event;

        // Filter out the keys we don"t want
        if (!this.items.length || !this.opened || !util.includes([13, 38, 40], e.which)) {
            this.navigating = false;
            return;
        }

        e.preventDefault();

        if (e.which === 13) {

            if ( this.noResults || (this.config.taggable && this.input.value.length > 0) ) {
                return false;
            }

            return this.change(this.navIndex);
        }

        var direction, prevEl = this.items[this.navIndex];
        var lastIndex = this.navIndex;

        switch (e.which) {
            case 38:
                direction = 0;
                if (this.navIndex > 0) {
                    this.navIndex--;
                }
                break;
            case 40:
                direction = 1;
                if (this.navIndex < this.items.length - 1) {
                    this.navIndex++;
                }
        }

        this.navigating = true;


        // Instead of wasting memory holding a copy of this.items
        // with disabled / excluded options omitted, skip them instead
        while (util.hasClass(this.items[this.navIndex], "disabled") || util.hasClass(this.items[this.navIndex], "excluded")) {
            if (this.navIndex > 0 && this.navIndex < this.items.length -1) {
                if (direction) {
                    this.navIndex++;
                } else {
                    this.navIndex--;
                }
            } else {
                this.navIndex = lastIndex;
                break;
            }

            if (this.searching) {
                if (this.navIndex > this.tree.lastElementChild.idx) {
                    this.navIndex = this.tree.lastElementChild.idx;
                    break;
                } else if (this.navIndex < this.tree.firstElementChild.idx) {
                    this.navIndex = this.tree.firstElementChild.idx;
                    break;
                }
            }
        }

        // Autoscroll the dropdown during navigation
        var r = util.rect(this.items[this.navIndex]);

        if (!direction) {
            if (this.navIndex === 0) {
                this.tree.scrollTop = 0;
            } else if (r.top - this.optsRect.top < 0) {
                this.tree.scrollTop = this.tree.scrollTop + (r.top - this.optsRect.top);
            }
        } else {
            if (this.navIndex === 0) {
                this.tree.scrollTop = 0;
            } else if ((r.top + r.height) > (this.optsRect.top + this.optsRect.height)) {
                this.tree.scrollTop = this.tree.scrollTop + ((r.top + r.height) - (this.optsRect.top + this.optsRect.height));
            }

            // Load another page if needed
            if (this.navIndex === this.tree.childElementCount - 1 && this.requiresPagination) {
                load.call(this);
            }
        }

        if (prevEl) {
            util.removeClass(prevEl, "active");
        }

        util.addClass(this.items[this.navIndex], "active");
    };

    /**
     * Add a tag
     * @param  {HTMLElement} item
     */
    var addTag = function(item) {
        var that = this,
            r;

        var docFrag = document.createDocumentFragment();
        var option = this.options[item.idx];
        var data = this.data ? this.data[item.idx] : option;
        var elementData = { class: "selectr-tag" };
        if (this.customSelected){
            elementData.html = this.config.renderSelection(data); // asume xss prevention in custom render function
        } else {
            elementData.textContent = option.textContent;
        }
        var tag = util.createElement("li", elementData);
        var btn = util.createElement("button", {
            class: "selectr-tag-remove",
            type: "button"
        });

        tag.appendChild(btn);

        // Set property to check against later
        tag.idx = item.idx;
        tag.tag = option.value;

        this.tags.push(tag);

        if (this.config.sortSelected) {

            var tags = this.tags.slice();

            // Deal with values that contain numbers
            r = function(val, arr) {
                val.replace(/(\d+)|(\D+)/g, function(that, $1, $2) {
                    arr.push([$1 || Infinity, $2 || ""]);
                });
            };

            tags.sort(function(a, b) {
                var x = [],
                    y = [],
                    ac, bc;
                if (that.config.sortSelected === true) {
                    ac = a.tag;
                    bc = b.tag;
                } else if (that.config.sortSelected === 'text') {
                    ac = a.textContent;
                    bc = b.textContent;
                }

                r(ac, x);
                r(bc, y);

                while (x.length && y.length) {
                    var ax = x.shift();
                    var by = y.shift();
                    var nn = (ax[0] - by[0]) || ax[1].localeCompare(by[1]);
                    if (nn) return nn;
                }

                return x.length - y.length;
            });

            util.each(tags, function(i, tg) {
                docFrag.appendChild(tg);
            });

            this.label.innerHTML = "";

        } else {
            docFrag.appendChild(tag);
        }

        if (this.config.taggable) {
            this.label.insertBefore(docFrag, this.input.parentNode);
        } else {
            this.label.appendChild(docFrag);
        }
    };

    /**
     * Remove a tag
     * @param  {HTMLElement} item
     * @return {void}
     */
    var removeTag = function(item) {
        var tag = false;

        util.each(this.tags, function(i, t) {
            if (t.idx === item.idx) {
                tag = t;
            }
        }, this);

        if (tag) {
            this.label.removeChild(tag);
            this.tags.splice(this.tags.indexOf(tag), 1);
        }
    };

    /**
     * Load the next page of items
     * @return {void}
     */
    var load = function() {
        var tree = this.tree;
        var scrollTop = tree.scrollTop;
        var scrollHeight = tree.scrollHeight;
        var offsetHeight = tree.offsetHeight;
        var atBottom = scrollTop >= (scrollHeight - offsetHeight);

        if ((atBottom && this.pageIndex < this.pages.length)) {
            var f = document.createDocumentFragment();

            util.each(this.pages[this.pageIndex], function(i, item) {
                appendItem(item, f, this.customOption);
            }, this);

            tree.appendChild(f);

            this.pageIndex++;

            this.emit("selectr.paginate", {
                items: this.items.length,
                total: this.data.length,
                page: this.pageIndex,
                pages: this.pages.length
            });
        }
    };

    /**
     * Clear a search
     * @return {void}
     */
    var clearSearch = function() {
        if (this.config.searchable || this.config.taggable) {
            this.input.value = null;
            this.searching = false;
            if (this.config.searchable) {
                util.removeClass(this.inputContainer, "active");
            }

            if (util.hasClass(this.container, "notice")) {
                util.removeClass(this.container, "notice");
                util.addClass(this.container, "open");
                this.input.focus();
            }

            util.each(this.items, function(i, item) {
                // Items that didn't match need the class
                // removing to make them visible again
                util.removeClass(item, "excluded");
                // Remove the span element for underlining matched items
                if (!this.customOption) {
                    // without xss
                    item.textContent = item.textContent;
                }
            }, this);
        }
    };

    /**
     * Query matching for searches.
     * Wraps matching text in a span.selectr-match.
     *
     * @param  {string} query
     * @param  {HTMLOptionElement} option element
     * @return {bool} true if matched; false otherwise
     */
    var match = function(query, option) {
        var text = option.textContent;
        var RX = new RegExp( query, "ig" );
        var result = RX.exec( text );
        if (result) {
            // #102 stop xss
            option.innerHTML = "";
            var span = document.createElement( "span" );
            span.classList.add( "selectr-match" );
            span.textContent = result[0];
            option.appendChild( document.createTextNode( text.substring( 0, result.index ) ) );
            option.appendChild( span );
            option.appendChild( document.createTextNode( text.substring( RX.lastIndex ) ) );
            return true;
        }
        return false;
    };

    // Main Lib
    var Selectr = function(el, config) {

        if (!el) {
            throw new Error("You must supply either a HTMLSelectElement or a CSS3 selector string.");
        }

        this.el = el;

        // CSS3 selector string
        if (typeof el === "string") {
            this.el = document.querySelector(el);
        }

        if (this.el === null) {
            throw new Error("The element you passed to Selectr can not be found.");
        }

        if (this.el.nodeName.toLowerCase() !== "select") {
            throw new Error("The element you passed to Selectr is not a HTMLSelectElement.");
        }

        this.render(config);
    };

    /**
     * Render the instance
     * @param  {object} config
     * @return {void}
     */
    Selectr.prototype.render = function(config) {

        if (this.rendered) return;

        /**
         * Default configuration options
         * @type {Object}
         */
        var defaultConfig = {
            /**
             * Emulates browser behaviour by selecting the first option by default
             * @type {Boolean}
             */
            defaultSelected: true,

            /**
             * Sets the width of the container
             * @type {String}
             */
            width: "auto",

            /**
             * Enables/ disables the container
             * @type {Boolean}
             */
            disabled: false,

            /**
             * Enables/ disables logic for mobile
             * @type {Boolean}
             */
            disabledMobile: false,

            /**
             * Enables / disables the search function
             * @type {Boolean}
             */
            searchable: true,

            /**
             * Enable disable the clear button
             * @type {Boolean}
             */
            clearable: false,

            /**
             * Sort the tags / multiselect options
             * @type {Boolean}
             */
            sortSelected: false,

            /**
             * Allow deselecting of select-one options
             * @type {Boolean}
             */
            allowDeselect: false,

            /**
             * Close the dropdown when scrolling (@AlexanderReiswich, #11)
             * @type {Boolean}
             */
            closeOnScroll: false,

            /**
             * Allow the use of the native dropdown (@jonnyscholes, #14)
             * @type {Boolean}
             */
            nativeDropdown: false,

            /**
             * Allow the use of native typing behavior for toggling, searching, selecting
             * @type {boolean}
             */
            nativeKeyboard: false,

            /**
             * Set the main placeholder
             * @type {String}
             */
            placeholder: "Select an option...",

            /**
             * Allow the tagging feature
             * @type {Boolean}
             */
            taggable: false,

            /**
             * Set the tag input placeholder (@labikmartin, #21, #22)
             * @type {String}
             */
            tagPlaceholder: "Enter a tag...",

            messages: {
                noResults: "No results.",
                noOptions: "No options available.",
                maxSelections: "A maximum of {max} items can be selected.",
                tagDuplicate: "That tag is already in use.",
                searchPlaceholder: "Search options..."
            }
        };

        // add instance reference (#87)
        this.el.selectr = this;

        // Merge defaults with user set config
        this.config = util.extend(defaultConfig, config);

        // Store type
        this.originalType = this.el.type;

        // Store tabIndex
        this.originalIndex = this.el.tabIndex;

        // Store defaultSelected options for form reset
        this.defaultSelected = [];

        // Store the original option count
        this.originalOptionCount = this.el.options.length;

        if (this.config.multiple || this.config.taggable) {
            this.el.multiple = true;
        }

        // Disabled?
        this.disabled = isset(this.config, "disabled");

        this.opened = false;

        if (this.config.taggable) {
            this.config.searchable = false;
        }

        this.navigating = false;

        this.mobileDevice = false;

        if (!this.config.disabledMobile && /Android|webOS|iPhone|iPad|BlackBerry|Windows Phone|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent)) {
            this.mobileDevice = true;
        }

        this.customOption = this.config.hasOwnProperty("renderOption") && typeof this.config.renderOption === "function";
        this.customSelected = this.config.hasOwnProperty("renderSelection") && typeof this.config.renderSelection === "function";

        this.supportsEventPassiveOption = this.detectEventPassiveOption();

        // Enable event emitter
        Events.mixin(this);

        build.call(this);

        this.bindEvents();

        this.update();

        this.optsRect = util.rect(this.tree);

        this.rendered = true;

        // Fixes macOS Safari bug #28
        if (!this.el.multiple) {
            this.el.selectedIndex = this.selectedIndex;
        }

        var that = this;
        setTimeout(function() {
            that.emit("selectr.init");
        }, 20);
    };

    Selectr.prototype.getSelected = function () {
        var selected = this.el.querySelectorAll('option:checked');
        return selected;
    };

    Selectr.prototype.getSelectedProperties = function (prop) {
        var selected = this.getSelected();
        var values = [].slice.call(selected)
        .map(function(option) { return option[prop]; })
        .filter(function(i) { return i!==null && i!==undefined; });
        return values;
    };

    /**
     * Feature detection: addEventListener passive option
     * https://dom.spec.whatwg.org/#dom-addeventlisteneroptions-passive
     * https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
     */
    Selectr.prototype.detectEventPassiveOption = function () {
        var supportsPassiveOption = false;
        try {
            var opts = Object.defineProperty({}, 'passive', {
                get: function() {
                    supportsPassiveOption = true;
                }
            });
            window.addEventListener('test', null, opts);
        } catch (e) {}
        return supportsPassiveOption;
    };

    /**
     * Attach the required event listeners
     */
    Selectr.prototype.bindEvents = function() {

        var that = this;

        this.events = {};

        this.events.dismiss = dismiss.bind(this);
        this.events.navigate = navigate.bind(this);
        this.events.reset = this.reset.bind(this);

        if (this.config.nativeDropdown || this.mobileDevice) {

            this.container.addEventListener("touchstart", function(e) {
                if (e.changedTouches[0].target === that.el) {
                    that.toggle();
                }
            }, this.supportsEventPassiveOption ? { passive: true } : false);

            this.container.addEventListener("click", function(e) {
                if (e.target === that.el) {
                    that.toggle();
                }
            });

            var getChangedOptions = function(last, current) {
                var added=[], removed=last.slice(0);
                var idx;
                for (var i=0; i<current.length; i++) {
                    idx = removed.indexOf(current[i]);
                    if (idx > -1)
                        removed.splice(idx, 1);
                    else
                        added.push(current[i]);
                }
                return [added, removed];
            };

            // Listen for the change on the native select
            // and update accordingly
            this.el.addEventListener("change", function(e) {
                if (e.__selfTriggered) {
                    return;
                }
                if (that.el.multiple) {
                    var indexes = that.getSelectedProperties('idx');
                    var changes = getChangedOptions(that.selectedIndexes, indexes);

                    util.each(changes[0], function(i, idx) {
                        that.select(idx);
                    }, that);

                    util.each(changes[1], function(i, idx) {
                        that.deselect(idx);
                    }, that);

                } else {
                    if (that.el.selectedIndex > -1) {
                        that.select(that.el.selectedIndex);
                    }
                }
            });

        }

        // Open the dropdown with Enter key if focused
        if ( this.config.nativeDropdown ) {
            this.container.addEventListener("keydown", function(e) {
                if (e.key === "Enter" && that.selected === document.activeElement) {
                    // show native dropdown
                    that.toggle();
                    // focus on it
                    setTimeout(function() {
                        that.el.focus();
                    }, 200);
                }
            });
        }

        // Non-native dropdown
        this.selected.addEventListener("click", function(e) {

            if (!that.disabled) {
                that.toggle();
            }

            e.preventDefault();
        });

        if ( this.config.nativeKeyboard ) {
            var typing = '';
            var typingTimeout = null;

            this.selected.addEventListener("keydown", function (e) {
                // Do nothing if disabled, not focused, or modifier keys are pressed
                if (
                    that.disabled ||
                    that.selected !== document.activeElement ||
                    (e.altKey || e.ctrlKey || e.metaKey)
                ) {
                    return;
                }

                // Open the dropdown on [enter], [ ], [↓], and [↑] keys
                if (
                    e.key === " " ||
                    (! that.opened && ["Enter", "ArrowUp", "ArrowDown"].indexOf(e.key) > -1)
                ) {
                    that.toggle();
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }

                // Type to search if multiple; type to select otherwise
                // make sure e.key is a single, printable character
                // .length check is a short-circut to skip checking keys like "ArrowDown", etc.
                // prefer "codePoint" methods; they work with the full range of unicode
                if (
                    e.key.length <= 2 &&
                    String[String.fromCodePoint ? "fromCodePoint" : "fromCharCode"](
                        e.key[String.codePointAt ? "codePointAt" : "charCodeAt"]( 0 )
                    ) === e.key
                ) {
                    if ( that.config.multiple ) {
                        that.open();
                        if ( that.config.searchable ) {
                            that.input.value = e.key;
                            that.input.focus();
                            that.search( null, true );
                        }
                    } else {
                        if ( typingTimeout ) {
                            clearTimeout( typingTimeout );
                        }
                        typing += e.key;
                        var found = that.search( typing, true );
                        if ( found && found.length ) {
                            that.clear();
                            that.setValue( found[0].value );
                        }
                        setTimeout(function () { typing = ''; }, 1000);
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
            });

            // Close the dropdown on [esc] key
            this.container.addEventListener("keyup", function (e) {
                if ( that.opened && e.key === "Escape" ) {
                    that.close();
                    e.stopPropagation();

                    // keep focus so we can re-open easily if desired
                    that.selected.focus();
                }
            });
        }

        // Remove tag
        this.label.addEventListener("click", function(e) {
            if (util.hasClass(e.target, "selectr-tag-remove")) {
                that.deselect(e.target.parentNode.idx);
            }
        });

        // Clear input
        if (this.selectClear) {
            this.selectClear.addEventListener("click", this.clear.bind(this));
        }

        // Prevent text selection
        this.tree.addEventListener("mousedown", function(e) {
            e.preventDefault();
        });

        // Select / deselect items
        this.tree.addEventListener("click", function(e) {
            var item = util.closest(e.target, function(el) {
                return el && util.hasClass(el, "selectr-option");
            });

            if (item) {
                if (!util.hasClass(item, "disabled")) {
                    if (util.hasClass(item, "selected")) {
                        if (that.el.multiple || !that.el.multiple && that.config.allowDeselect) {
                            that.deselect(item.idx);
                        }
                    } else {
                        that.select(item.idx);
                    }

                    if (that.opened && !that.el.multiple) {
                        that.close();
                    }
                }
            }

            e.preventDefault();
            e.stopPropagation();
        });

        // Mouseover list items
        this.tree.addEventListener("mouseover", function(e) {
            if (util.hasClass(e.target, "selectr-option")) {
                if (!util.hasClass(e.target, "disabled")) {
                    util.removeClass(that.items[that.navIndex], "active");

                    util.addClass(e.target, "active");

                    that.navIndex = [].slice.call(that.items).indexOf(e.target);
                }
            }
        });

        // Searchable
        if (this.config.searchable) {
            // Show / hide the search input clear button

            this.input.addEventListener("focus", function(e) {
                that.searching = true;
            });

            this.input.addEventListener("blur", function(e) {
                that.searching = false;
            });

            this.input.addEventListener("keyup", function(e) {
                that.search();

                if (!that.config.taggable) {
                    // Show / hide the search input clear button
                    if (this.value.length) {
                        util.addClass(this.parentNode, "active");
                    } else {
                        util.removeClass(this.parentNode, "active");
                    }
                }
            });

            // Clear the search input
            this.inputClear.addEventListener("click", function(e) {
                that.input.value = null;
                clearSearch.call(that);

                if (!that.tree.childElementCount) {
                    render.call(that);
                }
            });
        }

        if (this.config.taggable) {
            this.input.addEventListener("keyup", function(e) {

                that.search();

                if (that.config.taggable && this.value.length) {
                    var _sVal = this.value.trim();

                    if (_sVal.length && (e.which === 13 || that.tagSeperatorsRegex.test(_sVal) )) {
                        var _sGrabbedTagValue = _sVal.replace(that.tagSeperatorsRegex, '');
                        _sGrabbedTagValue = util.escapeRegExp(_sGrabbedTagValue);
                        _sGrabbedTagValue = _sGrabbedTagValue.trim();

                        var _oOption;
                        if(_sGrabbedTagValue.length){
                            _oOption = that.add({
                                value: _sGrabbedTagValue,
                                textContent: _sGrabbedTagValue,
                                selected: true
                            }, true);
                        }

                        if(_oOption){
                            that.close();
                            clearSearch.call(that);
                        } else {
                            this.value = '';
                            that.setMessage(that.config.messages.tagDuplicate);
                        }
                    }
                }
            });
        }

        this.update = util.debounce(function() {
            // Optionally close dropdown on scroll / resize (#11)
            if (that.opened && that.config.closeOnScroll) {
                that.close();
            }
            if (that.width) {
                that.container.style.width = that.width;
            }
            that.invert();
        }, 50);

        if (this.requiresPagination) {
            this.paginateItems = util.debounce(function() {
                load.call(this);
            }, 50);

            this.tree.addEventListener("scroll", this.paginateItems.bind(this));
        }

        // Dismiss when clicking outside the container
        document.addEventListener("click", this.events.dismiss);
        window.addEventListener("keydown", this.events.navigate);

        window.addEventListener("resize", this.update);
        window.addEventListener("scroll", this.update);

        // remove event listeners on destroy()
        this.on('selectr.destroy', function () {
            document.removeEventListener("click", this.events.dismiss);
            window.removeEventListener("keydown", this.events.navigate);
            window.removeEventListener("resize", this.update);
            window.removeEventListener("scroll", this.update);
        });

        // Listen for form.reset() (@ambrooks, #13)
        if (this.el.form) {
            this.el.form.addEventListener("reset", this.events.reset);

            // remove listener on destroy()
            this.on('selectr.destroy', function () {
                this.el.form.removeEventListener("reset", this.events.reset);
            });
        }
    };

    /**
     * Check for selected options
     * @param {bool} reset
     */
    Selectr.prototype.setSelected = function(reset) {

        // Select first option as with a native select-one element - #21, #24
        if (!this.config.data && !this.el.multiple && this.el.options.length) {
            // Browser has selected the first option by default
            if (this.el.selectedIndex === 0) {
                if (!this.el.options[0].defaultSelected && !this.config.defaultSelected) {
                    this.el.selectedIndex = -1;
                }
            }

            this.selectedIndex = this.el.selectedIndex;

            if (this.selectedIndex > -1) {
                this.select(this.selectedIndex);
            }
        }

        // If we're changing a select-one to select-multiple via the config
        // and there are no selected options, the first option will be selected by the browser
        // Let's prevent that here.
        if (this.config.multiple && this.originalType === "select-one" && !this.config.data) {
            if (this.el.options[0].selected && !this.el.options[0].defaultSelected) {
                this.el.options[0].selected = false;
            }
        }

        util.each(this.options, function(i, option) {
            if (option.selected && option.defaultSelected) {
                this.select(option.idx);
            }
        }, this);

        if (this.config.selectedValue) {
            this.setValue(this.config.selectedValue);
        }

        if (this.config.data) {


            if (!this.el.multiple && this.config.defaultSelected && this.el.selectedIndex < 0 && this.config.data.length > 0) {
                this.select(0);
            }

            var j = 0;
            util.each(this.config.data, function(i, opt) {
                // Check for group options
                if (isset(opt, "children")) {
                    util.each(opt.children, function(x, item) {
                        if (item.hasOwnProperty("selected") && item.selected === true) {
                            this.select(j);
                        }
                        j++;
                    }, this);
                } else {
                    if (opt.hasOwnProperty("selected") && opt.selected === true) {
                        this.select(j);
                    }
                    j++;
                }
            }, this);
        }
    };

    /**
     * Destroy the instance
     * @return {void}
     */
    Selectr.prototype.destroy = function() {

        if (!this.rendered) return;

        this.emit("selectr.destroy");

        // Revert to select-single if programtically set to multiple
        if (this.originalType === 'select-one') {
            this.el.multiple = false;
        }

        if (this.config.data) {
            this.el.innerHTML = "";
        }

        // Remove the className from select element
        util.removeClass(this.el, 'selectr-hidden');

        // Replace the container with the original select element
        this.container.parentNode.replaceChild(this.el, this.container);

        this.rendered = false;

        // remove reference
        delete this.el.selectr;
    };

    /**
     * Change an options state
     * @param  {Number} index
     * @return {void}
     */
    Selectr.prototype.change = function(index) {
        var item = this.items[index],
            option = this.options[index];

        if (option.disabled) {
            return;
        }

        if (option.selected && util.hasClass(item, "selected")) {
            this.deselect(index);
        } else {
            this.select(index);
        }

        if (this.opened && !this.el.multiple) {
            this.close();
        }
    };

    /**
     * Select an option
     * @param  {Number} index
     * @return {void}
     */
    Selectr.prototype.select = function(index) {

        var item = this.items[index],
            options = [].slice.call(this.el.options),
            option = this.options[index];

        if (this.el.multiple) {
            if (util.includes(this.selectedIndexes, index)) {
                return false;
            }

            if (this.config.maxSelections && this.tags.length === this.config.maxSelections) {
                this.setMessage(this.config.messages.maxSelections.replace("{max}", this.config.maxSelections), true);
                return false;
            }

            this.selectedValues.push(option.value);
            this.selectedIndexes.push(index);

            addTag.call(this, item);
        } else {
            var data = this.data ? this.data[index] : option;
            if (this.customSelected) {
                this.label.innerHTML = this.config.renderSelection(data);
            } else {
                // no xss
                this.label.textContent = option.textContent;
            }

            this.selectedValue = option.value;
            this.selectedIndex = index;

            util.each(this.options, function(i, o) {
                var opt = this.items[i];

                if (i !== index) {
                    if (opt) {
                        util.removeClass(opt, "selected");
                    }
                    o.selected = false;
                    o.removeAttribute("selected");
                }
            }, this);
        }

        if (!util.includes(options, option)) {
            this.el.add(option);
        }

        item.setAttribute("aria-selected", true);

        util.addClass(item, "selected");
        util.addClass(this.container, "has-selected");

        option.selected = true;
        option.setAttribute("selected", "");

        this.emit("selectr.change", option);

        this.emit("selectr.select", option);

        // fire native change event
        if ("createEvent" in document) {
            var evt = document.createEvent("HTMLEvents");
            evt.initEvent("change", true, true);
            evt.__selfTriggered = true;
            this.el.dispatchEvent(evt);
        } else {
            this.el.fireEvent("onchange");
        }
    };

    /**
     * Deselect an option
     * @param  {Number} index
     * @return {void}
     */
    Selectr.prototype.deselect = function(index, force) {
        var item = this.items[index],
            option = this.options[index];

        if (this.el.multiple) {
            var selIndex = this.selectedIndexes.indexOf(index);
            this.selectedIndexes.splice(selIndex, 1);

            var valIndex = this.selectedValues.indexOf(option.value);
            this.selectedValues.splice(valIndex, 1);

            removeTag.call(this, item);

            if (!this.tags.length) {
                util.removeClass(this.container, "has-selected");
            }
        } else {

            if (!force && !this.config.clearable && !this.config.allowDeselect) {
                return false;
            }

            this.label.innerHTML = "";
            this.selectedValue = null;

            this.el.selectedIndex = this.selectedIndex = -1;

            util.removeClass(this.container, "has-selected");
        }


        this.items[index].setAttribute("aria-selected", false);

        util.removeClass(this.items[index], "selected");

        option.selected = false;

        option.removeAttribute("selected");

        this.emit("selectr.change", null);

        this.emit("selectr.deselect", option);

        // fire native change event
        if ("createEvent" in document) {
            var evt = document.createEvent("HTMLEvents");
            evt.initEvent("change", true, true);
            evt.__selfTriggered = true;
            this.el.dispatchEvent(evt);
        } else {
            this.el.fireEvent("onchange");
        }
    };

    /**
     * Programmatically set selected values
     * @param {String|Array} value - A string or an array of strings
     */
    Selectr.prototype.setValue = function(value) {
        var isArray = Array.isArray(value);

        if (!isArray) {
            value = value.toString().trim();
        }

        // Can't pass array to select-one
        if (!this.el.multiple && isArray) {
            return false;
        }

        util.each(this.options, function(i, option) {
            if (isArray && (value.indexOf(option.value) > -1) || option.value === value) {
                this.change(option.idx);
            }
        }, this);
    };

    /**
     * Set the selected value(s)
     * @param  {bool} toObject Return only the raw values or an object
     * @param  {bool} toJson   Return the object as a JSON string
     * @return {mixed}         Array or String
     */
    Selectr.prototype.getValue = function(toObject, toJson) {
        var value;

        if (this.el.multiple) {
            if (toObject) {
                if (this.selectedIndexes.length) {
                    value = {};
                    value.values = [];
                    util.each(this.selectedIndexes, function(i, index) {
                        var option = this.options[index];
                        value.values[i] = {
                            value: option.value,
                            text: option.textContent
                        };
                    }, this);
                }
            } else {
                value = this.selectedValues.slice();
            }
        } else {
            if (toObject) {
                var option = this.options[this.selectedIndex];
                value = {
                    value: option.value,
                    text: option.textContent
                };
            } else {
                value = this.selectedValue;
            }
        }

        if (toObject && toJson) {
            value = JSON.stringify(value);
        }

        return value;
    };

    /**
     * Add a new option or options
     * @param {object} data
     */
    Selectr.prototype.add = function(data, checkDuplicate) {
        if (data) {
            this.data = this.data || [];
            this.items = this.items || [];
            this.options = this.options || [];

            if (Array.isArray(data)) {
                // We have an array on items
                util.each(data, function(i, obj) {
                    this.add(obj, checkDuplicate);
                }, this);
            }
            // User passed a single object to the method
            // or Selectr passed an object from an array
            else if ("[object Object]" === Object.prototype.toString.call(data)) {

                if (checkDuplicate) {
                    var dupe = false;

                    util.each(this.options, function(i, option) {
                        if (option.value.toLowerCase() === data.value.toLowerCase()) {
                            dupe = true;
                        }
                    });

                    if (dupe) {
                        return false;
                    }
                }

                var option = util.createElement('option', data);

                this.data.push(data);

                // fix for native iOS dropdown otherwise the native dropdown will be empty
                if (this.mobileDevice) {
                    this.el.add(option);
                }

                // Add the new option to the list
                this.options.push(option);

                // Add the index for later use
                option.idx = this.options.length > 0 ? this.options.length - 1 : 0;

                // Create a new item
                createItem.call(this, option);

                // Select the item if required
                if (data.selected) {
                    this.select(option.idx);
                }

                                // We may have had an empty select so update
                                // the placeholder to reflect the changes.
                                this.setPlaceholder();

                return option;
            }

            // Recount the pages
            if (this.config.pagination) {
                this.paginate();
            }

            return true;
        }
    };

    /**
     * Remove an option or options
     * @param  {Mixed} o Array, integer (index) or string (value)
     * @return {Void}
     */
    Selectr.prototype.remove = function(o) {
        var options = [];
        if (Array.isArray(o)) {
            util.each(o, function(i, opt) {
                if (util.isInt(opt)) {
                    options.push(this.getOptionByIndex(opt));
                } else if (typeof opt === "string") {
                    options.push(this.getOptionByValue(opt));
                }
            }, this);

        } else if (util.isInt(o)) {
            options.push(this.getOptionByIndex(o));
        } else if (typeof o === "string") {
            options.push(this.getOptionByValue(o));
        }

        if (options.length) {
            var index;
            util.each(options, function(i, option) {
                index = option.idx;

                // Remove the HTMLOptionElement
                this.el.remove(option);

                // Remove the reference from the option array
                this.options.splice(index, 1);

                // If the item has a parentNode (group element) it needs to be removed
                // otherwise the render function will still append it to the dropdown
                var parentNode = this.items[index].parentNode;

                if (parentNode) {
                    parentNode.removeChild(this.items[index]);
                }

                // Remove reference from the items array
                this.items.splice(index, 1);

                // Reset the indexes
                util.each(this.options, function(i, opt) {
                    opt.idx = i;
                    this.items[i].idx = i;
                }, this);
            }, this);

            // We may have had an empty select now so update
            // the placeholder to reflect the changes.
            this.setPlaceholder();

            // Recount the pages
            if (this.config.pagination) {
                this.paginate();
            }
        }
    };

    /**
     * Remove all options
     */
    Selectr.prototype.removeAll = function() {

        // Clear any selected options
        this.clear(true);

        // Remove the HTMLOptionElements
        util.each(this.el.options, function(i, option) {
            this.el.remove(option);
        }, this);

        // Empty the dropdown
        util.truncate(this.tree);

        // Reset variables
        this.items = [];
        this.options = [];
        this.data = [];

        this.navIndex = 0;

        if (this.requiresPagination) {
            this.requiresPagination = false;

            this.pageIndex = 1;
            this.pages = [];
        }

        // Update the placeholder
        this.setPlaceholder();
    };

    /**
     * Perform a search
     * @param {string}|{null} query The query string (taken from user input if null)
     * @param {boolean} anchor Anchor search to beginning of strings (defaults to false)?
     * @return {Array} Search results, as an array of {text, value} objects
     */
    Selectr.prototype.search = function( string, anchor ) {
        if ( this.navigating ) {
            return;
        }

        // we're only going to alter the DOM for "live" searches
        var live = false;
        if ( ! string ) {
            string = this.input.value;
            live = true;

            // Remove message and clear dropdown
            this.removeMessage();
            util.truncate(this.tree);
        }
        var results = [];
        var f = document.createDocumentFragment();

        string = string.trim().toLowerCase();

        if ( string.length > 0 ) {
            var compare = anchor ? util.startsWith : util.includes;

            util.each( this.options, function ( i, option ) {
                var item = this.items[option.idx];
                var matches = compare( option.textContent.trim().toLowerCase(), string );

                if ( matches && !option.disabled ) {
                    results.push( { text: option.textContent, value: option.value } );
                    if ( live ) {
                        appendItem( item, f, this.customOption );
                        util.removeClass( item, "excluded" );

                        // Underline the matching results
                        if ( !this.customOption ) {
                            match( string, option );
                        }
                    }
                } else if ( live ) {
                    util.addClass( item, "excluded" );
                }
            }, this);

            if ( live ) {
                // Append results
                if ( !f.childElementCount ) {
                    if ( !this.config.taggable ) {
                        this.noResults = true;
                        this.setMessage( this.config.messages.noResults );
                    }
                } else {
                    // Highlight top result (@binary-koan #26)
                    var prevEl = this.items[this.navIndex];
                    var firstEl = f.querySelector(".selectr-option:not(.excluded)");
                    this.noResults = false;

                    util.removeClass( prevEl, "active" );
                    this.navIndex = firstEl.idx;
                    util.addClass( firstEl, "active" );
                }

                this.tree.appendChild( f );
            }
        } else {
            render.call(this);
        }

        return results;
    };

    /**
     * Toggle the dropdown
     * @return {void}
     */
    Selectr.prototype.toggle = function() {
        if (!this.disabled) {
            if (this.opened) {
                this.close();
            } else {
                this.open();
            }
        }
    };

    /**
     * Open the dropdown
     * @return {void}
     */
    Selectr.prototype.open = function() {

        var that = this;

        if (!this.options.length) {
            return false;
        }

        if (!this.opened) {
            this.emit("selectr.open");
        }

        this.opened = true;

        if (this.mobileDevice || this.config.nativeDropdown) {
            util.addClass(this.container, "native-open");

            if (this.config.data) {
                // Dump the options into the select
                // otherwise the native dropdown will be empty
                util.each(this.options, function(i, option) {
                    this.el.add(option);
                }, this);
            }

            return;
        }

        util.addClass(this.container, "open");

        render.call(this);

        this.invert();

        this.tree.scrollTop = 0;

        util.removeClass(this.container, "notice");

        this.selected.setAttribute("aria-expanded", true);

        this.tree.setAttribute("aria-hidden", false);
        this.tree.setAttribute("aria-expanded", true);

        if (this.config.searchable && !this.config.taggable) {
            setTimeout(function() {
                that.input.focus();
                // Allow tab focus
                that.input.tabIndex = 0;
            }, 10);
        }
    };

    /**
     * Close the dropdown
     * @return {void}
     */
    Selectr.prototype.close = function() {

        if (this.opened) {
            this.emit("selectr.close");
        }

        this.opened = false;
        this.navigating = false;

        if (this.mobileDevice || this.config.nativeDropdown) {
            util.removeClass(this.container, "native-open");
            return;
        }

        var notice = util.hasClass(this.container, "notice");

        if (this.config.searchable && !notice) {
            this.input.blur();
            // Disable tab focus
            this.input.tabIndex = -1;
            this.searching = false;
        }

        if (notice) {
            util.removeClass(this.container, "notice");
            this.notice.textContent = "";
        }

        util.removeClass(this.container, "open");
        util.removeClass(this.container, "native-open");

        this.selected.setAttribute("aria-expanded", false);

        this.tree.setAttribute("aria-hidden", true);
        this.tree.setAttribute("aria-expanded", false);

        util.truncate(this.tree);
        clearSearch.call(this);
    };


    /**
     * Enable the element
     * @return {void}
     */
    Selectr.prototype.enable = function() {
        this.disabled = false;
        this.el.disabled = false;

        this.selected.tabIndex = this.originalIndex;

        if (this.el.multiple) {
            util.each(this.tags, function(i, t) {
                t.lastElementChild.tabIndex = 0;
            });
        }

        util.removeClass(this.container, "selectr-disabled");
    };

    /**
     * Disable the element
     * @param  {boolean} container Disable the container only (allow value submit with form)
     * @return {void}
     */
    Selectr.prototype.disable = function(container) {
        if (!container) {
            this.el.disabled = true;
        }

        this.selected.tabIndex = -1;

        if (this.el.multiple) {
            util.each(this.tags, function(i, t) {
                t.lastElementChild.tabIndex = -1;
            });
        }

        this.disabled = true;
        util.addClass(this.container, "selectr-disabled");
    };


    /**
     * Reset to initial state
     * @return {void}
     */
    Selectr.prototype.reset = function() {
        if (!this.disabled) {
            this.clear();

            this.setSelected(true);

            util.each(this.defaultSelected, function(i, idx) {
                this.select(idx);
            }, this);

            this.emit("selectr.reset");
        }
    };

    /**
     * Clear all selections
     * @return {void}
     */
    Selectr.prototype.clear = function(force, isClearLast) {

        if (this.el.multiple) {
            // Loop over the selectedIndexes so we don't have to loop over all the options
            // which can be costly if there are a lot of them

            if (this.selectedIndexes.length) {
                // Copy the array or we'll get an error
                var indexes = this.selectedIndexes.slice();

                if (isClearLast) {
                    this.deselect(indexes.slice(-1)[0]);
                } else {
                    util.each(indexes, function(i, idx) {
                        this.deselect(idx);
                    }, this);
                }
            }
        } else {
            if (this.selectedIndex > -1) {
                this.deselect(this.selectedIndex, force);
            }
        }

        this.emit("selectr.clear");
    };

    /**
     * Return serialised data
     * @param  {boolean} toJson
     * @return {mixed} Returns either an object or JSON string
     */
    Selectr.prototype.serialise = function(toJson) {
        var data = [];
        util.each(this.options, function(i, option) {
            var obj = {
                value: option.value,
                text: option.textContent
            };

            if (option.selected) {
                obj.selected = true;
            }
            if (option.disabled) {
                obj.disabled = true;
            }
            data[i] = obj;
        });

        return toJson ? JSON.stringify(data) : data;
    };

    /**
     * Localised version of serialise() method
     */
    Selectr.prototype.serialize = function(toJson) {
        return this.serialise(toJson);
    };

    /**
     * Sets the placeholder
     * @param {String} placeholder
     */
    Selectr.prototype.setPlaceholder = function(placeholder) {
        // Set the placeholder
        placeholder = placeholder || this.config.placeholder || this.el.getAttribute("placeholder");

        if (!this.options.length) {
            placeholder = this.config.messages.noOptions;
        }

        this.placeEl.innerHTML = placeholder;
    };

    /**
     * Paginate the option list
     * @return {Array}
     */
    Selectr.prototype.paginate = function() {
        if (this.items.length) {
            var that = this;

            this.pages = this.items.map(function(v, i) {
                return i % that.config.pagination === 0 ? that.items.slice(i, i + that.config.pagination) : null;
            }).filter(function(pages) {
                return pages;
            });

            return this.pages;
        }
    };

    /**
     * Display a message
     * @param  {String} message The message
     */
    Selectr.prototype.setMessage = function(message, close) {
        if (close) {
            this.close();
        }
        util.addClass(this.container, "notice");
        this.notice.textContent = message;
    };

    /**
     * Dismiss the current message
     */
    Selectr.prototype.removeMessage = function() {
        util.removeClass(this.container, "notice");
        this.notice.innerHTML = "";
    };

    /**
     * Keep the dropdown within the window
     * @return {void}
     */
    Selectr.prototype.invert = function() {
        var rt = util.rect(this.selected),
            oh = this.tree.parentNode.offsetHeight,
            wh = window.innerHeight,
            doInvert = rt.top + rt.height + oh > wh;

        if (doInvert) {
            util.addClass(this.container, "inverted");
            this.isInverted = true;
        } else {
            util.removeClass(this.container, "inverted");
            this.isInverted = false;
        }

        this.optsRect = util.rect(this.tree);
    };

    /**
     * Get an option via it's index
     * @param  {Integer} index The index of the HTMLOptionElement required
     * @return {HTMLOptionElement}
     */
    Selectr.prototype.getOptionByIndex = function(index) {
        return this.options[index];
    };

    /**
     * Get an option via it's value
     * @param  {String} value The value of the HTMLOptionElement required
     * @return {HTMLOptionElement}
     */
    Selectr.prototype.getOptionByValue = function(value) {
        var option = false;

        for (var i = 0, l = this.options.length; i < l; i++) {
            if (this.options[i].value.trim() === value.toString().trim()) {
                option = this.options[i];
                break;
            }
        }

        return option;
    };

    return Selectr;
}));
}

mSelectr.call(window);

//------------------------------------------------------------------------------

function mTailSelect()
{
var Element = window.Element;

/*
 |  tail.select - The vanilla solution to make your HTML select fields AWESOME!
 |  @file       ./js/tail.select-full.js
 |  @author     SamBrishes <sam@pytes.net>
 |  @version    0.5.15 - Beta
 |
 |  @website    https://github.com/pytesNET/tail.select
 |  @license    X11 / MIT License
 |  @copyright  Copyright © 2014 - 2019 SamBrishes, pytesNET <info@pytes.net>
 */
;(function(root, factory){
    if(typeof define === "function" && define.amd){
        define(function(){ return factory(root); });
    } else if(typeof module === "object" && module.exports){
        module.exports = factory(root);
    } else {
        if(typeof root.tail === "undefined"){
            root.tail = {};
        }
        root.tail.select = factory(root);

        // jQuery Support
        if(typeof jQuery !== "undefined"){
            jQuery.fn.tailselect = function(o){
                var r = [], i;
                this.each(function(){ if((i = tail.select(this, o)) !== false){ r.push(i); } });
                return (r.length === 1)? r[0]: (r.length === 0)? false: r;
            };
        }

        // MooTools Support
        if(typeof(MooTools) != "undefined"){
            Element.implement({ tailselect: function(o){ return new tail.select(this, o); } });
        }
    }
}(window, function(root){
    "use strict";
    var w = root, d = root.document;

    // Internal Helper Methods
    function cHAS(el, name){
        return (el && "classList" in el)? el.classList.contains(name): false;
    }
    function cADD(el, name){
        return (el && "classList" in el)? el.classList.add(name): undefined;
    }
    function cREM(el, name){
        return (el && "classList" in el)? el.classList.remove(name): undefined;
    }
    function trigger(el, event, opt){
        if(CustomEvent && CustomEvent.name){
            var ev = new CustomEvent(event, opt);
        } else {
            var ev = d.createEvent("CustomEvent");
            ev.initCustomEvent(event, !!opt.bubbles, !!opt.cancelable, opt.detail);
        }
        return el.dispatchEvent(ev);
    }
    function clone(obj, rep){
        if(typeof Object.assign === "function"){
            return Object.assign({}, obj, rep || {});
        }
        var clone = Object.constructor();
        for(var key in obj){
            clone[key] = (key in rep)? rep[key]: obj[key];
        }
        return clone;
    }
    function create(tag, classes){
        var r = d.createElement(tag);
            r.className = (classes && classes.join)? classes.join(" "): classes || "";
        return r;
    }

    /*
     |  SELECT CONSTRUCTOR
     |  @since  0.5.12 [0.3.0]
     */
    var select = function(el, config){
        el = (typeof(el) == "string")? d.querySelectorAll(el): el;
        if(el instanceof NodeList || el instanceof HTMLCollection || el instanceof Array){
            for(var _r = [], l = el.length, i = 0; i < l; i++){
                _r.push(new select(el[i], clone(config, {})));
            }
            return (_r.length === 1)? _r[0]: ((_r.length === 0)? false: _r);
        }
        if(!(el instanceof Element) || !(this instanceof select)){
            return !(el instanceof Element)? false: new select(el, config);
        }

        // Check Element
        if(select.inst[el.getAttribute("data-tail-select")]){
            return select.inst[el.getAttribute("data-tail-select")];
        }
        if(el.getAttribute("data-select")){
            var test = JSON.parse(el.getAttribute("data-select").replace(/\'/g, '"'));
            if(test instanceof Object){
                config = clone(config, test); // This is a unofficial function ;3
            }
        }

        // Get Element Options
        var placeholder = el.getAttribute("placeholder") || el.getAttribute("data-placeholder"),
            fb1 = "bindSourceSelect", fb2 = "sourceHide"; // Fallbacks
        config = (typeof(config) == "object")? config: {};
        config.multiple = ("multiple" in config)? config.multiple: el.multiple;
        config.disabled = ("disabled" in config)? config.disabled: el.disabled;
        config.placeholder = placeholder || config.placeholder || null;
        config.width = (config.width === "auto")? el.offsetWidth + 50: config.width;
        config.sourceBind = (fb1 in config)? config[fb1]: config.sourceBind || false;
        config.sourceHide = (fb2 in config)? config[fb2]: config.sourceHide || true;
        config.multiLimit = (config.multiLimit >= 0)? config.multiLimit: Infinity;

        // Init Instance
        this.e = el;
        this.id = ++select.count;
        this.con = clone(select.defaults, config);
        this.events = {};
        select.inst["tail-" + this.id] = this;
        return this.init().bind();
    }, options;
    select.version = "0.5.15";
    select.status = "beta";
    select.count = 0;
    select.inst = {};

    /*
     |  STORAGE :: DEFAULT OPTIONS
     */
    select.defaults = {
        animate: true,              // [0.3.0]      Boolean
        classNames: null,           // [0.2.0]      Boolean, String, Array, null
        csvOutput: false,           // [0.3.4]      Boolean
        csvSeparator: ",",          // [0.3.4]      String
        descriptions: false,        // [0.3.0]      Boolean
        deselect: false,            // [0.3.0]      Boolean
        disabled: false,            // [0.5.0]      Boolean
        height: 350,                // [0.2.0]      Integer, null
        hideDisabled: false,        // [0.3.0]      Boolean
        hideSelected: false,        // [0.3.0]      Boolean
        items: {},                  // [0.3.0]      Object
        locale: "en",               // [0.5.0]      String
        linguisticRules: {          // [0.5.9]      Object
            "е": "ё",
            "a": "ä",
            "o": "ö",
            "u": "ü",
            "ss": "ß"
        },
        multiple: false,            // [0.2.0]      Boolean
        multiLimit: Infinity,       // [0.3.0]      Integer, Infinity
        multiPinSelected: false,    // [0.5.0]      Boolean
        multiContainer: false,      // [0.3.0]      Boolean, String
        multiShowCount: true,       // [0.3.0]      Boolean
        multiShowLimit: false,      // [0.5.0]      Boolean
        multiSelectAll: false,      // [0.4.0]      Boolean
        multiSelectGroup: true,     // [0.4.0]      Boolean
        openAbove: null,            // [0.3.0]      Boolean, null
        placeholder: null,          // [0.2.0]      String, null
        search: false,              // [0.3.0]      Boolean
        searchConfig: [             // [0.5.13]     Array
            "text", "value"
        ],
        searchFocus: true,          // [0.3.0]      Boolean
        searchMarked: true,         // [0.3.0]      Boolean
        searchMinLength: 1,         // [0.5.13]     Integer
        searchDisabled: true,       // [0.5.5]      Boolean
        sortItems: false,           // [0.3.0]      String, Function, false
        sortGroups: false,          // [0.3.0]      String, Function, false
        sourceBind: false,          // [0.5.0]      Boolean
        sourceHide: true,           // [0.5.0]      Boolean
        startOpen: false,           // [0.3.0]      Boolean
        stayOpen: false,            // [0.3.0]      Boolean
        width: null,                // [0.2.0]      Integer, String, null
        cbComplete: undefined,      // [0.5.0]      Function
        cbEmpty: undefined,         // [0.5.0]      Function
        cbLoopItem: undefined,      // [0.4.0]      Function
        cbLoopGroup: undefined      // [0.4.0]      Function
    };

    /*
     |  STORAGE :: STRINGS
     */
    select.strings = {
        de: {
            all: "Alle",
            none: "Keine",
            empty: "Keine Optionen verfügbar",
            emptySearch: "Keine Optionen gefunden",
            limit: "Keine weiteren Optionen wählbar",
            placeholder: "Wähle eine Option...",
            placeholderMulti: "Wähle bis zu :limit Optionen...",
            search: "Tippen zum suchen",
            disabled: "Dieses Feld ist deaktiviert"
        },
        en: {
            all: "All",
            none: "None",
            empty: "No Options available",
            emptySearch: "No Options found",
            limit: "You can't select more Options",
            placeholder: "Select an Option...",
            placeholderMulti: "Select up to :limit Options...",
            search: "Type in to search...",
            disabled: "This Field is disabled"
        },
        es: {
            all: "Todos",
            none: "Ninguno",
            empty: "No hay opciones disponibles",
            emptySearch: "No se encontraron opciones",
            limit: "No puedes seleccionar mas opciones",
            placeholder: "Selecciona una opción...",
            placeholderMulti: "Selecciona hasta :límite de opciones...",
            search: "Escribe dentro para buscar...",
            disabled: "Este campo esta deshabilitado"
        },
        fi: {
            all: "Kaikki",
            none: "Ei mitään",
            empty: "Ei vaihtoehtoja",
            emptySearch: "Etsimääsi vaihtoehtoa ei löytynyt",
            limit: "Muita vaihtoehtoja ei voi valita",
            placeholder: "Valitse...",
            placeholderMulti: "Valitse maksimissaan :limit...",
            search: "Hae tästä...",
            disabled: "Kenttä on poissa käytöstä"
        },
        fr: {
            all: "Tous",
            none: "Aucun",
            empty: "Aucune option disponible",
            emptySearch: "Aucune option trouvée",
            limit: "Aucune autre option sélectionnable",
            placeholder: "Choisissez une option...",
            placeholderMulti: "Choisissez jusqu'à :limit option(s)...",
            search: "Rechercher...",
            disabled: "Ce champs est désactivé"
        },
        it: {
            all: "Tutti",
            none: "Nessuno",
            empty: "Nessuna voce disponibile",
            emptySearch: "Nessuna voce trovata",
            limit: "Non puoi selezionare più Voci",
            placeholder: "Seleziona una Voce",
            placeholderMulti: "Selezione limitata a :limit Voci...",
            search: "Digita per cercare...",
            disabled: "Questo Campo è disabilitato"
        },
        no: {
            all: "Alle",
            none: "Ingen",
            empty: "Ingen valg tilgjengelig",
            emptySearch: "Ingen valg funnet",
            limit: "Du kan ikke velge flere",
            placeholder: "Velg...",
            placeholderMulti: "Velg opptil :limit...",
            search: "Søk...",
            disabled: "Dette feltet er deaktivert"
        },
        pt_BR: {
            all: "Todas",
            none: "Nenhuma",
            empty: "Nenhuma opção disponível",
            emptySearch: "Nenhuma opção encontrada",
            limit: "Não é possível selecionar outra opção",
            placeholder: "Escolha uma opção ...",
            placeholderMulti: "Escolha até: :limit opção(ões) ...",
            search: "Buscar ...",
            disabled: "Campo desativado"
        },
        ru: {
            all: "Все",
            none: "Ничего",
            empty: "Нет доступных вариантов",
            emptySearch: "Ничего не найдено",
            limit: "Вы не можете выбрать больше вариантов",
            placeholder: "Выберите вариант...",
            placeholderMulti: function(args){
                var strings = ["варианта", "вариантов", "вариантов"], cases = [2, 0, 1, 1, 1, 2], num = args[":limit"];
                var string = strings[(num%100 > 4 && num%100 < 20)? 2: cases[(num%10 < 5)? num%10: 5]];
                return "Выбор до :limit " + string + " ...";
            },
            search: "Начните набирать для поиска ...",
            disabled: "Поле отключено"
        },
        tr: {
            all: "Tümü",
            none: "Hiçbiri",
            empty: "Seçenek yok",
            emptySearch: "Seçenek bulunamadı",
            limit: "Daha fazla Seçenek seçemezsiniz",
            placeholder: "Bir Seçenek seçin...",
            placeholderMulti: "En fazla :limit Seçenek seçin...",
            search: "Aramak için yazın...",
            disabled: "Bu Alan kullanılamaz"
        },
        modify: function(locale, id, string){
            if(!(locale in this)){
                return false;
            }
            if((id instanceof Object)){
                for(var key in id){
                    this.modify(locale, key, id[key]);
                }
            } else {
                this[locale][id] = (typeof(string) == "string")? string: this[locale][id];
            }
            return true;
        },
        register: function(locale, object){
            if(typeof(locale) != "string" || !(object instanceof Object)){
                return false;
            }
            this[locale] = object;
            return true;
        }
    };

    /*
     |  TAIL.SELECT HANDLER
     */
    select.prototype = {
        /*
         |  INERNAL :: TRANSLATE
         |  @since  0.5.8 [0.5.8]
         */
        _e: function(string, replace, def){
            if(!(string in this.__)){
                return (!def)? string: def;
            }

            var string = this.__[string];
            if(typeof(string) === "function"){
                string = string.call(this, replace);
            }
            if(typeof(replace) === "object"){
                for(var key in replace){
                    string = string.replace(key, replace[key]);
                }
            }
            return string;
        },

        /*
         |  INTERNAL :: INIT SELECT FIELD
         |  @since  0.5.13 [0.3.0]
         */
        init: function(){
            var self = this, classes = ["tail-select", "input"], con = this.con,
                regexp = /^[0-9.]+(?:cm|mm|in|px|pt|pc|em|ex|ch|rem|vw|vh|vmin|vmax|\%)$/i;

            // Init ClassNames
            var c = (con.classNames === true)? this.e.className: con.classNames;
            classes.push((c && c.push)? c.join(" "): (c && c.split)? c: "no-classes");
            if(con.hideSelected){    classes.push("hide-selected"); }
            if(con.hideDisabled){    classes.push("hide-disabled"); }
            if(con.multiLimit == 0){ classes.push("disabled");      }
            if(con.multiple){        classes.push("multiple");      }
            if(con.deselect){        classes.push("deselect");      }
            if(con.disabled){        classes.push("disabled");      }

            // Init Variables
            this.__ = clone(select.strings.en, select.strings[con.locale] || {});
            this._init = true;
            this._query = false;
            this.select = create("DIV", classes);
            this.label = create("DIV", "select-label input");
            this.dropdown = create("DIV", "select-dropdown");
            this.search = create("DIV", "dropdown-search");
            this.csvInput = create("INPUT", "select-search");

            // Build :: Select
            if(this.e.getAttribute("tabindex") !== null){
                this.select.setAttribute("tabindex", this.e.getAttribute("tabindex"));
            } else {
                this.select.setAttribute("tabindex", 0);
            }
            if(con.width && regexp.test(con.width)){
                this.select.style.width = con.width;
            } else if(con.width && !isNaN(parseFloat(con.width, 10))){
                this.select.style.width = con.width + "px";
            }

            // Build :: Label
            this.label.addEventListener("click", function(event){
                self.toggle.call(self, self.con.animate);
            });
            this.select.appendChild(this.label);

            // Build :: Dropdown
            if(!isNaN(parseInt(con.height, 10))){
                this.dropdown.style.maxHeight = parseInt(con.height, 10) + "px";
            }
            if(con.search){
                this.search.innerHTML = '<input type="text" class="search-input" />';
                this.search.children[0].placeholder = this._e("search");
                this.search.children[0].addEventListener("input", function(event){
                    self.query.call(self, (this.value.length > con.searchMinLength)? this.value: undefined);
                });
                this.dropdown.appendChild(this.search);
            }
            this.select.appendChild(this.dropdown);

            // Build :: CSV Input
            this.csvInput.type = "hidden";
            if(con.csvOutput){
                this.csvInput.name = this.e.name;
                this.e.removeAttribute("name");
                this.select.appendChild(this.csvInput);
            }

            // Prepare Container
            if(con.multiple && con.multiContainer){
                if(d.querySelector(con.multiContainer)){
                    this.container = d.querySelector(con.multiContainer);
                    this.container.className += " tail-select-container";
                } else if(con.multiContainer === true){
                    this.container = this.label;
                    this.container.className += " tail-select-container";
                }
            }

            // Prepare Options
            this.options = new options(this.e, this);
            for(var l = this.e.options.length, i = 0; i < l; i++){
                this.options.set(this.e.options[i], false);
            }
            for(var key in con.items){
                if(typeof(con.items[key]) == "string"){
                    con.items[key] = {value: con.items[key]};
                }
                this.options.add(con.items[key].key || key, con.items[key].value,
                    con.items[key].group, con.items[key].selected,
                    con.items[key].disabled, con.items[key].description);
            }
            this.query();

            // Append and Return
            if(this.e.nextElementSibling){
                this.e.parentElement.insertBefore(this.select, this.e.nextElementSibling);
            } else {
                this.e.parentElement.appendChild(this.select);
            }
            if(con.sourceHide){
                if(this.e.style.display == "none"){
                    this.select.style.display = "none";
                    this.e.setAttribute("data-select-hidden", "display");
                } else if(this.e.style.visibility == "hidden"){
                    this.select.style.visibiltiy = "hidden";
                    this.e.setAttribute("data-select-hidden", "visibility");
                } else {
                    this.e.style.display = "none";
                    this.e.setAttribute("data-select-hidden", "0");
                }
            }
            this.e.setAttribute("data-tail-select", "tail-" + this.id);
            if(self.con.startOpen){
                this.open(con.animate);
            }
            (con.cbComplete || function(){ }).call(this, this.select);
            return (this._init = false)? this: this;
        },

        /*
         |  INTERNAL :: EVENT LISTENER
         |  @since  0.5.13 [0.3.0]
         */
        bind: function(){
            var self = this;

            // Keys Listener
            d.addEventListener("keydown", function(event){
                var key = (event.keyCode || event.which), opt, inner, e, temp, tmp;
                var space = (key == 32 && self.select === document.activeElement);
                if(!space && (!cHAS(self.select, "active") || [13, 27, 38, 40].indexOf(key) < 0)){
                    return false;
                }
                event.preventDefault();
                event.stopPropagation();

                // Space
                if(key === 32){
                    return self.open(self.con.animate);
                }

                // Enter || Escape
                if(key == 13){
                    if((opt = self.dropdown.querySelector(".dropdown-option.hover:not(.disabled)"))){
                        self.options.select.call(self.options, opt);
                    }
                }
                if(key == 27 || key == 13){
                    return self.close(self.con.animate);
                }

                // Top || Down
                if((opt = self.dropdown.querySelector(".dropdown-option.hover:not(.disabled)"))){
                    cREM(opt, "hover"); e = [((key == 40)? "next": "previous") + "ElementSibling"];
                    do {
                        if((temp = opt[e]) !== null && opt.tagName == "LI"){
                            opt = temp;
                        } else if((temp = opt.parentElement[e]) !== null && temp.children.length > 0 && temp.tagName == "UL"){
                            opt = temp.children[(key == 40)? 0: temp.children.length-1];
                        } else {
                            opt = false;
                        }
                        if(opt && (!cHAS(opt, "dropdown-option") || cHAS(opt, "disabled"))){
                            continue;
                        }
                        break;
                    } while(true);
                }
                if(!opt && key == 40){
                    opt = self.dropdown.querySelector(".dropdown-option:not(.disabled)");
                } else if(!opt && key == 38){
                    tmp = self.dropdown.querySelectorAll(".dropdown-option:not(.disabled)");
                    opt = tmp[tmp.length - 1];
                }
                if(opt && (inner = self.dropdown.querySelector(".dropdown-inner"))){
                    var pos = (function(el){
                        var _r = {top: el.offsetTop, height: el.offsetHeight};
                        while((el = el.parentElement) != inner){
                            _r.top += el.offsetTop;
                        }
                        return _r;
                    })(opt);
                    cADD(opt, "hover");
                    inner.scrollTop = Math.max(0, pos.top - (pos.height * 2));
                }
                return true;
            });

            // Close
            d.addEventListener("click", function(ev){
                if(!cHAS(self.select, "active") || cHAS(self.select, "idle")){ return false; }
                if(self.con.stayOpen === true){ return false; }

                var targets = [self.e, self.select, self.container];
                for(var l = targets.length, i = 0; i < l; i++){
                    if(targets[i] && (targets[i].contains(ev.target) || targets[i] == ev.target)){
                        return false;
                    }
                    if(!ev.target.parentElement){ return false; }
                }
                return self.close.call(self, self.con.animate);
            });

            // Bind Source Select
            if(!this.con.sourceBind){
                return true;
            }
            this.e.addEventListener("change", function(event){
                if(event.detail != undefined){
                    return false;
                }
                event.preventDefault();
                event.stopPropagation();
                if(!this.multiple && this.selectedIndex){
                    self.options.select.call(self.options, this.options[this.selectedIndex]);
                } else {
                    var u = [].concat(self.options.selected);
                    var s = [].filter.call(this.querySelectorAll("option:checked"), function(item){
                        if(u.indexOf(item) >= 0){
                            u.splice(u.indexOf(item), 1);
                            return false;
                        }
                        return true;
                    });
                    self.options.walk.call(self.options, "unselect", u);
                    self.options.walk.call(self.options, "select", s);
                }
            });
            return true;
        },

        /*
         |  INTERNAL :: INTERNAL CALLBACK
         |  @since  0.5.14 [0.3.0]
         */
        callback: function(item, state, _force){
            var rkey = item.key.replace(/('|\\)/g, "\\$1"),
                rgrp = item.group.replace(/('|\\)/g, "\\$1"),
                rsel = "[data-key='" + rkey + "'][data-group='" + rgrp + "']";
            if(state == "rebuild"){ return this.query(); }

            // Set Element-Item States
            var element = this.dropdown.querySelector(rsel);
            if(element && ["select", "disable"].indexOf(state) >= 0){
                cADD(element, (state == "select"? "selected": "disabled"));
            } else if(element && ["unselect", "enable"].indexOf(state) >= 0){
                cREM(element, (state == "unselect"? "selected": "disabled"));
            }

            // Handle
            this.update(item);
            return (_force === true)? true: this.trigger("change", item, state);
        },

        /*
         |  INTERNAL :: TRIGGER EVENT HANDLER
         |  @since  0.5.2 [0.4.0]
         */
        trigger: function(event){
            if(this._init){ return false; }
            var obj = {bubbles: false, cancelable: true, detail: {args: arguments, self: this}};
            if(event == "change" && arguments[2] && arguments[2].indexOf("select") >= 0){
                trigger(this.e, "input", obj);
                trigger(this.e, "change", obj);
            }
            trigger(this.select, "tail::" + event, obj);

            var args = [], pass;
            Array.prototype.map.call(arguments, function(item, i){
                if(i > 0){ args.push(item); }
            });
            (this.events[event] || []).forEach(function(item){
                pass = [].concat(args);
                pass.push(item.args || null);
                (item.cb || function(){ }).apply(obj.detail.self, pass);
            });
            return true;
        },

        /*
         |  INTERNAL :: CALCULATE DROPDOWN
         |  @since  0.5.4 [0.5.0]
         */
        calc: function(){
            var clone = this.dropdown.cloneNode(true), height = this.con.height, search = 0,
                inner = this.dropdown.querySelector(".dropdown-inner");

            // Calculate Dropdown Height
            clone = this.dropdown.cloneNode(true);
            clone.style.cssText = "height:auto;min-height:auto;max-height:none;opacity:0;display:block;visibility:hidden;";
            clone.style.maxHeight = this.con.height + "px";
            clone.className += " cloned";
            this.dropdown.parentElement.appendChild(clone);
            height = (height > clone.clientHeight)? clone.clientHeight: height;
            if(this.con.search){
                search = clone.querySelector(".dropdown-search").clientHeight;
            }
            this.dropdown.parentElement.removeChild(clone);

            // Calculate Viewport
            var pos = this.select.getBoundingClientRect(),
                bottom = w.innerHeight-(pos.top+pos.height),
                view = ((height+search) > bottom)? pos.top > bottom: false;
            if(this.con.openAbove === true || (this.con.openAbove !== false && view)){
                view = true, height = Math.min((height), pos.top-10);
                cADD(this.select, "open-top");
            } else {
                view = false, height = Math.min((height), bottom-10);
                cREM(this.select, "open-top");
            }
            if(inner){
                this.dropdown.style.maxHeight = height + "px";
                inner.style.maxHeight = (height-search) + "px";
            }
            return this;
        },

        /*
         |  API :: QUERY OPTIONS
         |  @since  0.5.13 [0.5.0]
         */
        query: function(search, conf){
            var item, tp, ul, li, a1, a2;                           // Pre-Definition
            var self = this, con = this.con, g = "getAttribute";    // Shorties
            var root = create("DIV", "dropdown-inner"),             // Contexts
                func = (!search)? "walker": "finder",
                args = (!search)? [con.sortItems, con.sortGroups]: [search, conf];

            // Option Walker
            this._query = (typeof(search) == "string")? search: false;
            while(item = this.options[func].apply(this.options, args)){
                if(!ul || (ul && ul[g]("data-group") !== item.group)){
                    tp = (con.cbLoopGroup || this.cbGroup).call(this, item.group, search, root);
                    if(tp instanceof Element){
                        ul = tp;
                        ul.setAttribute("data-group", item.group);
                        root.appendChild(ul);
                    } else { break; }
                }

                // Create Item
                if((li = (con.cbLoopItem || this.cbItem).call(this, item, ul, search, root)) === null){
                    continue;
                }
                if(li === false){ break; }
                li.setAttribute("data-key", item.key);
                li.setAttribute("data-group", item.group);
                li.addEventListener("click", function(event){
                    if(!this.hasAttribute("data-key")){ return false; }
                    var key = this[g]("data-key"), group = this[g]("data-group") || "#";
                    if(self.options.toggle.call(self.options, key, group)){
                        if(self.con.stayOpen === false && !self.con.multiple){
                            self.close.call(self, self.con.animate);
                        }
                    }
                });
                ul.appendChild(li);
            }

            // Empty
            var count = root.querySelectorAll("*[data-key]").length;
            if(count == 0){
                (this.con.cbEmpty || function(element){
                    var li = create("SPAN", "dropdown-empty");
                    li.innerText = this._e("empty");
                    element.appendChild(li);
                }).call(this, root, search);
            }

            // Select All
            if(count > 0 && con.multiple && con.multiLimit == Infinity && con.multiSelectAll){
                a1 = create("BUTTON", "tail-all"), a2 = create("BUTTON", "tail-none");
                a1.innerText = this._e("all");
                a1.addEventListener("click", function(event){
                    event.preventDefault();
                    var options = self.dropdown.querySelectorAll(".dropdown-inner .dropdown-option");
                    self.options.walk.call(self.options, "select", options);
                })
                a2.innerText = this._e("none");
                a2.addEventListener("click", function(event){
                    event.preventDefault();
                    var options = self.dropdown.querySelectorAll(".dropdown-inner .dropdown-option");
                    self.options.walk.call(self.options, "unselect", options);
                })

                // Add Element
                li = create("SPAN", "dropdown-action");
                li.appendChild(a1);
                li.appendChild(a2);
                root.insertBefore(li, root.children[0]);
            }

            // Add and Return
            var data = this.dropdown.querySelector(".dropdown-inner");
            this.dropdown[(data? "replace": "append") + "Child"](root, data);
            if(cHAS(this.select, "active")){
                this.calc();
            }
            return this.updateCSV().updateLabel();
        },

        /*
         |  API :: CALLBACK -> CREATE GROUP
         |  @since  0.5.8 [0.4.0]
         */
        cbGroup: function(group, search){
            var ul = create("UL", "dropdown-optgroup"), self = this, a1, a2;
            if(group == "#"){ return ul; }
            ul.innerHTML = '<li class="optgroup-title"><b>' + group + '</b></li>';
            if(this.con.multiple && this.con.multiLimit == Infinity && this.con.multiSelectAll){
                a1 = create("BUTTON", "tail-none"), a2 = create("BUTTON", "tail-all");
                a1.innerText = this._e("none");
                a1.addEventListener("click", function(event){
                    event.preventDefault();
                    var grp = this.parentElement.parentElement.getAttribute("data-group");
                    self.options.all.call(self.options, "unselect", grp);
                });
                a2.innerText = this._e("all");
                a2.addEventListener("click", function(event){
                    event.preventDefault();
                    var grp = this.parentElement.parentElement.getAttribute("data-group");
                    self.options.all.call(self.options, "select", grp);
                });
                ul.children[0].appendChild(a1);
                ul.children[0].appendChild(a2);
            }
            return ul;
        },

        /*
         |  API :: CALLBACK -> CREATE ITEM
         |  @since  0.5.13 [0.4.0]
         */
        cbItem: function(item, optgroup, search){
            var li = create("LI", "dropdown-option" + (item.selected? " selected": "") + (item.disabled? " disabled": ""));

            // Inner Text
            if(search && search.length > 0 && this.con.searchMarked){
                search = this.options.applyLinguisticRules(search);
                li.innerHTML = item.value.replace(new RegExp("(" + search + ")", "i"), "<mark>$1</mark>");
            } else {
                li.innerText = item.value;
            }

            // Inner Description
            if(this.con.descriptions && item.description){
                li.innerHTML += '<span class="option-description">' + item.description + '</span>';
            }
            return li;
        },

        /*
         |  API :: UPDATE EVERYTHING
         |  @since  0.5.0 [0.5.0]
         */
        update: function(item){
            return this.updateLabel().updateContainer(item).updatePin(item).updateCSV(item);
        },

        /*
         |  API :: UPDATE LABEL
         |  @since  0.5.8 [0.5.0]
         */
        updateLabel: function(label){
            if(this.container == this.label && this.options.selected.length > 0){
                if(this.label.querySelector(".label-inner")){
                    this.label.removeChild(this.label.querySelector(".label-inner"));
                }
                if(this.label.querySelector(".label-count")){
                    this.label.removeChild(this.label.querySelector(".label-count"));
                }
                return this;
            }
            var c = this.con, len = this.options.selected.length, limit;
            if(typeof(label) != "string"){
                if(c.disabled){
                    label = "disabled";
                } else if(this.dropdown.querySelectorAll("*[data-key]").length == 0){
                    label = "empty" + (cHAS(this.select, "in-search")? "Search": "");
                } else if(c.multiLimit <= len){
                    label = "limit";
                } else if(!c.multiple && this.options.selected.length > 0){
                    label = this.options.selected[0].innerText;
                } else if(typeof(c.placeholder) == "string"){
                    label = c.placeholder;
                } else {
                    label = "placeholder" + (c.multiple && c.multiLimit < Infinity? "Multi": "");
                }
            }

            // Set HTML
            label = this._e(label, {":limit": c.multiLimit}, label);
            label = '<span class="label-inner input">' + label + '</span>',
            limit = (c.multiShowLimit && c.multiLimit < Infinity);
            if(c.multiple && c.multiShowCount){
                label = '<span class="label-count">:c</span>' + label;
                label = label.replace(":c", len + (limit? (" / " + c.multiLimit): ""));
            }
            this.label.innerHTML = label;
            return this;
        },

        /*
         |  API :: UPDATE CONTAINER
         |  @since  0.5.0 [0.5.0]
         */
        updateContainer: function(item){
            if(!this.container || !this.con.multiContainer){
                return this;
            }
            var s = "[data-group='" + item.group + "'][data-key='" + item.key + "']";
            if(this.container.querySelector(s)){
                if(!item.selected){
                    this.container.removeChild(this.container.querySelector(s));
                }
                return this;
            }

            // Create Item
            if(item.selected){
                var self = this, hndl = create("DIV", "select-handle");
                hndl.innerText = item.value;
                hndl.setAttribute("data-key", item.key);
                hndl.setAttribute("data-group", item.group);
                hndl.addEventListener("click", function(event){
                    event.preventDefault();
                    event.stopPropagation();
                    var key = this.getAttribute("data-key"), grp = this.getAttribute("data-group");
                    self.options.unselect.call(self.options, key, grp);
                });
                this.container.appendChild(hndl);
            }
            return this;
        },

        /*
         |  API :: UPDATE PIN POSITION
         |  @since  0.5.3 [0.5.0]
         */
        updatePin: function(item){
            var inner = this.dropdown.querySelector(".dropdown-inner ul"),
                option = "li[data-key='" + item.key + "'][data-group='" + item.group + "']";
            if(!this.con.multiPinSelected || !inner || this._query !== false){
                return this;
            }

            // Create Item
            option = this.dropdown.querySelector(option);
            if(item.selected){
                inner.insertBefore(option, inner.children[0]);
            } else {
                var grp = this.dropdown.querySelector("ul[data-group='" + item.group + "']"),
                    prev = this.options[item.index-1], found = false;
                while(prev && prev.group == item.group){
                    if(found = grp.querySelector("li[data-key='" + prev.key + "']")){
                        break;
                    }
                    prev = this.options[prev.index-1];
                }
                if(found && found.nextElementSibling){
                    grp.insertBefore(option, found.nextElementSibling);
                } else {
                    grp.appendChild(option);
                }
            }
            return this;
        },

        /*
         |  API :: UPDATE CSV INPUT
         |  @since  0.5.0 [0.5.0]
         */
        updateCSV: function(item){
            if(!this.csvInput || !this.con.csvOutput){
                return this;
            }
            for(var selected = [], l = this.options.selected.length, i = 0; i < l; i++){
                selected.push(this.options.selected[i].value);
            }
            this.csvInput.value = selected.join(this.con.csvSeparator || ",");
            return this;
        },

        /*
         |  PUBLIC :: OPEN DROPDOWN
         |  @since  0.5.0 [0.3.0]
         */
        open: function(animate){
            if(cHAS(this.select, "active") || cHAS(this.select, "idle") || this.con.disabled){
                return false;
            }
            this.calc();

            // Final Function
            var final = function(){
                cADD(self.select, "active");
                cREM(self.select, "idle");
                this.dropdown.style.height = "auto";
                this.dropdown.style.overflow = "visible";
                this.label.removeAttribute("style");
                if(this.con.search && this.con.searchFocus){
                    this.dropdown.querySelector("input").focus();
                }
                this.trigger.call(this, "open");
            }, self = this, e = this.dropdown.style;

            // Open
            if(animate !== false){
                this.label.style.zIndex = 25;
                this.dropdown.style.cssText += "height:0;display:block;overflow:hidden;";
                cADD(self.select, "idle");
                (function animate(){
                    var h = parseInt(e.height, 10), m = parseInt(e.maxHeight, 10);
                    if(h >= m){
                        return final.call(self);
                    }
                    e.height = ((h+50 > m)? m: h+50) + "px";
                    setTimeout(animate, 20);
                })();
            } else {
                e.cssText = "height:" + e.maxHeight + ";display:block;overflow:hidden;";
                final.call(this);
            }
            return this;
        },

        /*
         |  PUBLIC :: CLOSE DROPDOWN
         |  @since  0.5.0 [0.3.0]
         */
        close: function(animate){
            if(!cHAS(this.select, "active") || cHAS(this.select, "idle")){
                return false;
            }
            var final = function(){
                cREM(this.select, "active");
                cREM(this.select, "idle");
                this.dropdown.removeAttribute("style");
                this.dropdown.querySelector(".dropdown-inner").removeAttribute("style");
                this.trigger.call(this, "close");
            }, self = this, e = this.dropdown;

            // Close
            if(animate !== false){
                cADD(this.select, "idle");
                this.dropdown.style.overflow = "hidden";
                (function animate(){
                    if((parseInt(e.offsetHeight, 10)-50) <= 0){
                        return final.call(self);
                    }
                    e.style.height = (parseInt(e.offsetHeight, 10)-50) + "px";
                    setTimeout(animate, 20);
                })();
            } else {
                final.call(this);
            }
            return this;
        },

        /*
         |  PUBLIC :: TOGGLE DROPDOWN
         |  @since  0.5.0 [0.3.0]
         */
        toggle: function(animate){
            if(cHAS(this.select, "active")){
                return this.close(animate);
            }
            return !cHAS(this.select, "idle")? this.open(animate): this;
        },

        /*
         |  PUBLIC :: REMOVE SELECT
         |  @since  0.5.3 [0.3.0]
         */
        remove: function(){
            this.e.removeAttribute("data-tail-select");
            if(this.e.hasAttribute("data-select-hidden")){
                if(this.e.getAttribute("data-select-hidden") == "0"){
                    this.e.style.removeProperty("display");
                }
                this.e.removeAttribute("data-select-hidden");
            }
            Array.prototype.map.call(this.e.querySelectorAll("[data-select-option='add']"), function(item){
                item.parentElement.removeChild(item);
            })
            Array.prototype.map.call(this.e.querySelectorAll("[data-select-optgroup='add']"), function(item){
                item.parentElement.removeChild(item);
            })
            this.e.name = (this.csvInput.hasAttribute("name"))? this.csvInput.name: this.e.name;
            if(this.select.parentElement){
                this.select.parentElement.removeChild(this.select);
            }
            if(this.container){
                var handles = this.container.querySelectorAll(".select-handle");
                for(var l = handles.length, i = 0; i < l; i++){
                    this.container.removeChild(handles[i]);
                }
            }
            return this;
        },

        /*
         |  PUBLIC :: RELOAD SELECT
         |  @since  0.5.0 [0.3.0]
         */
        reload: function(){
            return this.remove().init();
        },

        /*
         |  PUBLIC :: GET|SET CONFIG
         |  @since  0.5.15 [0.4.0]
         */
        config: function(key, value, rebuild){
            if(key instanceof Object){
                for(var k in key){ this.config(k, key[k], false); }
                return this.reload()? this.con: this.con;
            }
            if(typeof(key) == "undefined"){
                return this.con;
            } else if(!(key in this.con)){
                return false;
            }

            // Set | Return
            if(typeof(value) == "undefined"){
                return this.con[key];
            }
            this.con[key] = value;
            if(rebuild !== false){
                this.reload();
            }
            return this;
        },
        enable: function(update){
            cREM(this.select, "disabled");
            this.e.disabled = false;
            this.con.disabled = false;
            return (update === false)? this: this.reload();
        },
        disable: function(update){
            cADD(this.select, "disabled");
            this.e.disabled = true;
            this.con.disabled = true;
            return (update === false)? this: this.reload();
        },

        /*
         |  PUBLIC :: CUSTOM EVENT LISTENER
         |  @since  0.5.0 [0.4.0]
         */
        on: function(event, callback, args){
            if(["open", "close", "change"].indexOf(event) < 0 || typeof(callback) != "function"){
                return false;
            }
            if(!(event in this.events)){
                this.events[event] = [];
            }
            this.events[event].push({cb: callback, args: (args instanceof Array)? args: []});
            return this;
        },

        /*
         |  PUBLIC :: VALUE
         |  @since  0.5.13 [0.5.13]
         */
        value: function(){
            if(this.options.selected.length == 0){
                return null;
            }
            if(this.con.multiple){
                return this.options.selected.map(function(opt){
                    return opt.value;
                });
            }
            return this.options.selected[0].value;
        }
    };

    /*
     |  OPTIONS CONSTRUCTOR
     |  @since  0.5.12 [0.3.0]
     */
    options = select.options = function(select, parent){
        if(!(this instanceof options)){
            return new options(select, parent);
        }
        this.self = parent;
        this.element = select;
        this.length = 0;
        this.selected = [];
        this.disabled = [];
        this.items = {"#": {}};
        this.groups = {};
        return this;
    }

    /*
     |  TAIL.OPTIONS HANDLER
     */
    options.prototype = {
        /*
         |  INTERNAL :: REPLACE TYPOs
         |  @since  0.5.0 [0.3.0]
         */
        _r: function(state){
            return state.replace("disabled", "disable").replace("enabled", "enable")
                        .replace("selected", "select").replace("unselected", "unselect");
        },

        /*
         |  GET AN EXISTING OPTION
         |  @since  0.5.7 [0.3.0]
         */
        get: function(key, grp){
            var g = "getAttribute";
            if(typeof(key) == "object" && key.key && key.group){
                grp = key.group || grp;
                key = key.key;
            } else if(key instanceof Element){
                if(key.tagName == "OPTION"){
                    grp = key.parentElement.label || "#";
                    key = key.value || key.innerText;
                } else if(key.hasAttribute("data-key")){
                    grp = key[g]("data-group") || key.parentElement[g]("data-group") || "#";
                    key = key[g]("data-key");
                }
            } else if(typeof(key) != "string"){
                return false;
            }
            key = (/^[0-9]+$/.test(key))? "_" + key: key;
            return (grp in this.items)? this.items[grp][key]: false;
        },

        /*
         |  SET AN EXISTING OPTION
         |  @since  0.5.15 [0.3.0]
         */
        set: function(opt, rebuild){
            var key = opt.value || opt.innerText, grp = opt.parentElement.label || "#";
            if(!(grp in this.items)){
                this.items[grp] = {};
                this.groups[grp] = opt.parentElement;
            }
            if(key in this.items[grp]){
                return false;
            }
            var id = (/^[0-9]+$/.test(key))? "_" + key: key;

            // Validate Selection
            var con = this.self.con;
            if(con.multiple && this.selected.length >= con.multiLimit){
                opt.selected = false;
            }
            if(opt.selected && con.deselect && (!opt.hasAttribute("selected") || con.multiLimit == 0)){
                opt.selected = false;
                opt.parentElement.selectedIndex = -1;
            }

            // Sanitize Description
            if(opt.hasAttribute("data-description")){
                var span = create("SPAN");
                    span.innerHTML = opt.getAttribute("data-description");
                opt.setAttribute("data-description", span.innerHTML);
            }

            // Add Item
            this.items[grp][id] = {
                key: key,
                value: opt.text,
                description: opt.getAttribute("data-description") || null,
                group: grp,
                option: opt,
                optgroup: (grp != "#")? this.groups[grp]: undefined,
                selected: opt.selected,
                disabled: opt.disabled,
                hidden: opt.hidden || false
            };
            this.length++;
            if(opt.selected){ this.select(this.items[grp][id]); }
            if(opt.disabled){ this.disable(this.items[grp][id]); }
            return (rebuild)? this.self.callback(this.items[grp][key], "rebuild"): true;
        },

        /*
         |  CREATE A NEW OPTION
         |  @since  0.5.13 [0.3.0]
         */
        add: function(key, value, group, selected, disabled, description, rebuild){
            if(key instanceof Object){
                for(var k in key){
                    this.add(key[k].key || k, key[k].value, key[k].group, key[k].selected, key[k].disabled, key[k].description, false);
                }
                return this.self.query();
            }
            if(this.get(key, group)){
                return false;
            }

            // Check Group
            group = (typeof(group) == "string")? group: "#";
            if(group !== "#" && !(group in this.groups)){
                var optgroup = create("OPTGROUP");
                optgroup.label = group;
                optgroup.setAttribute("data-select-optgroup", "add");
                this.element.appendChild(optgroup);
                this.items[group] = {};
                this.groups[group] = optgroup;
            }

            // Validate Selection
            if(this.self.con.multiple && this.selected.length >= this.self.con.multiLimit){
                selected = false;
            }
            disabled = !!disabled;

            // Create Option
            var option = d.createElement("OPTION");
            option.value = key;
            option.selected = selected;
            option.disabled = disabled;
            option.innerText = value;
            option.setAttribute("data-select-option", "add");
            if(description && description.length > 0){
                option.setAttribute("data-description", description);
            }

            // Add Option and Return
            ((group == "#")? this.element: this.groups[group]).appendChild(option);
            return this.set(option, rebuild);
        },

        /*
         |  MOVE AN EXISTING OPTION
         |  @since  0.5.0 [0.5.0]
         */
        move: function(item, group, new_group, rebuild){
            if(!(item = this.get(item, group))){ return false; }

            // Create Group
            if(new_group !== "#" && !(new_group in this.groups)){
                var optgroup = create("OPTGROUP");
                optgroup.label = new_group;
                this.element.appendChild(optgroup);
                this.items[new_group] = {};
                this.groups[new_group] = optgroup;
                this.groups[new_group].appendChild(item.option);
            }

            // Move To Group
            delete this.items[item.group][item.key];
            item.group = new_group;
            item.optgroup = this.groups[new_group] || undefined;
            this.items[new_group][item.key] = item;
            return (rebuild)? this.self.query(): true;
        },

        /*
         |  REMOVE AN EXISTING OPTION
         |  @since  0.5.7 [0.3.0]
         */
        remove: function(item, group, rebuild){
            if(!(item = this.get(item, group))){ return false; }
            if(item.selected){ this.unselect(item); }
            if(item.disabled){ this.enable(item); }

            // Remove Data
            item.option.parentElement.removeChild(item.option);
            var id = (/^[0-9]+$/.test(item.key))? "_" + item.key: item.key;
            delete this.items[item.group][id];
            this.length--;

            // Remove Optgroup
            if(Object.keys(this.items[item.group]).length === 0){
                delete this.items[item.group];
                delete this.groups[item.group];
            }
            return (rebuild)? this.self.query(): true;
        },

        /*
         |  CHECK AN EXISTING OPTION
         |  @since  0.5.0 [0.3.0]
         */
        is: function(state, key, group){
            var state = this._r(state), item = this.get(key, group);
            if(!item || ["select", "unselect", "disable", "enable"].indexOf(state) < 0){
                return null;
            }
            if(state == "disable" || state == "enable"){
                return (state == "disable")? item.disabled: !item.disabled;
            } else if(state == "select" || state == "unselect"){
                return (state == "select")? item.selected: !item.selected;
            }
            return false;
        },

        /*
         |  INTERACT WITH AN OPTION
         |  @since  0.5.3 [0.3.0]
         */
        handle: function(state, key, group, _force){
            var item = this.get(key, group), state = this._r(state);
            if(!item || ["select", "unselect", "disable", "enable"].indexOf(state) < 0){
                return null;
            }

            // Disable || Enable
            if(state == "disable" || state == "enable"){
                if(!(item.option in this.disabled) && state == "disable"){
                    this.disabled.push(item.option);
                } else if((item.option in this.disabled) && state == "enable"){
                    this.disabled.splice(this.disabled.indexOf(item.option), 1);
                }
                item.disabled = (state == "disable");
                item.option.disabled = (state == "disable");
                return this.self.callback.call(this.self, item, state);
            }

            // Select || Unselect
            var dis = (cHAS(this.self.select, "disabled") || item.disabled || item.option.disabled),
                lmt = (this.self.con.multiple && this.self.con.multiLimit <= this.selected.length),
                sgl = (!this.self.con.multiple && this.selected.indexOf(item.option) > 0),
                del = (this.self.con.multiLimit == 0 && this.self.con.deselect == true),
                uns = (!this.self.con.multiple && !this.self.con.deselect && _force !== true);
            if(state == "select"){
                if(dis || lmt || del || sgl){
                    return false;
                }
                if(!this.self.con.multiple){
                    for(var i in this.selected){
                        this.unselect(this.selected[i], undefined, true);
                    }
                }
                if(this.selected.indexOf(item.option) < 0){
                    this.selected.push(item.option);
                }
            } else if(state == "unselect"){
                if(dis || uns){
                    return false;
                }
                this.selected.splice(this.selected.indexOf(item.option), 1);
            }
            item.selected = (state == "select");
            item.option.selected = (state == "select");
            item.option[(state.length > 6? "remove": "set") + "Attribute"]("selected", "selected");
            return this.self.callback.call(this.self, item, state, _force);
        },
        enable: function(key, group){
            return this.handle("enable", key, group, false);
        },
        disable: function(key, group){
            return this.handle("disable", key, group, false);
        },
        select: function(key, group){
            return this.handle("select", key, group, false);
        },
        unselect: function(key, group, _force){
            return this.handle("unselect", key, group, _force);
        },
        toggle: function(item, group){
            if(!(item = this.get(item, group))){ return false; }
            return this.handle((item.selected? "unselect": "select"), item, group, false);
        },

        /*
         |  INVERT CURRENT <STATE>
         |  @since  0.5.15 [0.3.0]
         */
        invert: function(state){
            state = this._r(state);
            if(["enable", "disable"].indexOf(state) >= 0){
                var invert = this.disabled, action = (state == "enable")? "disable": "enable";
            } else if(["select", "unselect"].indexOf(state) >= 0){
                var invert = this.selected, action = (state == "select")? "unselect": "select";
            }
            var convert = Array.prototype.filter.call(this, function(element){
                return !(element in invert);
            }), self = this;

            // Loop
            [].concat(invert).forEach(function(item){
                self.handle.call(self, action, item);
            });
            [].concat(convert).forEach(function(item){
                self.handle.call(self, state, item);
            });
            return true;
        },

        /*
         |  SET <STATE> ON ALL OPTIONs
         |  @since  0.5.0 [0.5.0]
         */
        all: function(state, group){
            var self = this, list = this;
            if(group in this.items){
                list = Object.keys(this.items[group]);
            } else if(["unselect", "enable"].indexOf(state) >= 0){
                list = [].concat((state == "unselect")? this.selected: this.disabled);
            }
            Array.prototype.forEach.call(list, function(item){
                self.handle.call(self, state, item, group, false);
            });
            return true;
        },

        /*
         |  SET <STATE> FOR A BUNCH OF OPTIONs
         |  @since  0.5.4 [0.5.3]
         */
        walk: function(state, items, args){
            if(items instanceof Array || items.length){
                for(var l = items.length, i = 0; i < l; i++){
                    this.handle.apply(this, [state, items[i], null].concat(args));
                }
            } else if(items instanceof Object){
                var self = this;
                if(items.forEach){
                    items.forEach(function(value){
                        self.handle.apply(self, [state, value, null].concat(args));
                    });
                } else {
                    for(var key in items){
                        if(typeof(items[key]) != "string" && typeof(items[key]) != "number" && !(items[key] instanceof Element)){
                            continue;
                        }
                        this.handle.apply(this, [state, items[key], (key in this.items? key: null)]).concat(args);
                    }
                }
            }
            return this;
        },

        /*
         |  APPLY LINGUSTIC RULES
         |  @since  0.5.13 [0.5.13]
         */
        applyLinguisticRules: function(search, casesensitive){
            var rules = this.self.con.linguisticRules, values = [];
            
            // Prepare Rules
            Object.keys(rules).forEach(function(key){ 
                values.push("(" + key + "|[" + rules[key] + "])");
            });
            if(casesensitive){
                values = values.concat(values.map(function(s){ return s.toUpperCase(); })); 
            }

            return search.replace(new RegExp(values.join("|"), (casesensitive)? "g": "ig"), function(m){
                return values[[].indexOf.call(arguments, m, 1) - 1];
            });
        },
    

        /*
         |  FIND SOME OPTIONs - ARRAY EDITION
         |  @since  0.5.15 [0.3.0]
         */
        find: function(search, config){
            var self = this, matches, has = {};
            
            // Get Config
            if(!config){
                config = this.self.con.searchConfig;
            }

            // Config Callback
            if(typeof config === "function"){
                matches = config.bind(this, search);
            }

            // Config Handler
            else {
                config = (config instanceof Array)? config: [config];
                config.forEach(function(c){
                    if(typeof(c) === "string"){ has[c] = true; }
                });
                has.any = (!has.any)? has.attributes && has.value: has.any;
                
                // Cleanup & Prepare
                if(!has.regex || has.text){
                    search = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                }
                if(!has.exactglyphes){
                    search = this.self.options.applyLinguisticRules(search, has.case);
                }
                if(has.word){
                    search = '\\b' + search + '\\b';
                }

                // Search
                var regex = new RegExp(search, (!has.case)? "mi": "m"),
                    sfunc = function(opt){ return regex.test(opt.text || opt.value); };
                
                // Handle
                if(has.any){
                    matches = function(opt){ return sfunc(opt) || [].some.call(opt.attributes, sfunc); };
                } else if(has.attributes){
                    matches = function(opt){ return [].some.call(opt.attributes, sfunc); };
                } else {
                    matches = sfunc;
                }

                if(!this.self.con.searchDisabled){
                    var temp = matches;
                    matches = function(opt){ return !opt.disabled && temp(opt); };
                }
            }

            // Hammer Time
            return [].filter.call(this.self.e.options, matches).map(function(opt){
                return opt.hidden? false: self.get(opt) 
            });
        },

        /*
         |  FIND SOME OPTIONs - WALKER EDITION
         |  @since  0.5.5 [0.3.0]
         */
        finder: function(search, config){
            if(this._finderLoop === undefined){
                this._finderLoop = this.find(search, config);
            }
            var item;
            while((item = this._finderLoop.shift()) !== undefined){
                return item;
            }
            delete this._finderLoop;
            return false;
        },

        /*
         |  NEW OPTIONS WALKER
         |  @since  0.5.15 [0.4.0]
         */
        walker: function(orderi, orderg){
            if(typeof(this._inLoop) != "undefined" && this._inLoop){
                if(this._inItems.length > 0){
                    do {
                        var temp = this.items[this._inGroup][this._inItems.shift()];
                    } while(temp.hidden === true);
                    return temp;
                }

                // Sort Items
                if(this._inGroups.length > 0){
                    while(this._inGroups.length > 0){
                        var group = this._inGroups.shift();
                        if(!(group in this.items)){
                            return false;
                        }

                        var keys = Object.keys(this.items[group]);
                        if(keys.length > 0){
                            break;
                        }
                    }
                    if(orderi == "ASC"){
                        keys.sort();
                    } else if(orderi == "DESC"){
                        keys.sort().reverse();
                    } else if(typeof(orderi) == "function"){
                        keys = orderi.call(this, keys);
                    }
                    this._inItems = keys;
                    this._inGroup = group;
                    return this.walker(null, null);
                }

                // Delete and Exit
                delete this._inLoop;
                delete this._inItems;
                delete this._inGroup;
                delete this._inGroups;
                return false;
            }

            // Sort Groups
            var groups = Object.keys(this.groups) || [];
            if(orderg == "ASC"){
                groups.sort();
            } else if(orderg == "DESC"){
                groups.sort().reverse();
            } else if(typeof(orderg) == "function"){
                groups = orderg.call(this, groups);
            }
            groups.unshift("#");

            // Init Loop
            this._inLoop = true;
            this._inItems = [];
            this._inGroups = groups;
            return this.walker(orderi, null);
        }
    };

    // Return
    return select;
}));

/*
 |  tail.select - The vanilla solution to make your HTML select fields AWESOME!
 |  @file       ./langs/tail.select-all.js
 |  @author     SamBrishes <sam@pytes.net>
 |  @version    0.5.15 - Beta
 |
 |  @website    https://github.com/pytesNET/tail.select
 |  @license    X11 / MIT License
 |  @copyright  Copyright © 2014 - 2019 SamBrishes, pytesNET <info@pytes.net>
 */
;(function(factory){
   if(typeof(define) == "function" && define.amd){
       define(function(){
           return function(select){ factory(select); };
       });
   } else {
       if(typeof(window.tail) != "undefined" && window.tail.select){
           factory(window.tail.select);
       }
   }
}(function(select){
    /*
     |  Translator:     SamBrishes - (https://www.pytes.net)
     |  GitHub:         <internal>
     */
    select.strings.register("de", {
        all: "Alle",
        none: "Keine",
        empty: "Keine Optionen verfügbar",
        emptySearch: "Keine Optionen gefunden",
        limit: "Keine weiteren Optionen wählbar",
        placeholder: "Wähle eine Option...",
        placeholderMulti: "Wähle bis zu :limit Optionen...",
        search: "Tippen zum suchen",
        disabled: "Dieses Feld ist deaktiviert"
    });

    /*
     |  Translator:     elPesecillo - (https://github.com/elPesecillo)
     |  GitHub:         https://github.com/pytesNET/tail.select/issues/41
     */
    select.strings.register("es", {
        all: "Todos",
        none: "Ninguno",
        empty: "No hay opciones disponibles",
        emptySearch: "No se encontraron opciones",
        limit: "No puedes seleccionar mas opciones",
        placeholder: "Selecciona una opción...",
        placeholderMulti: "Selecciona hasta :límite de opciones...",
        search: "Escribe dentro para buscar...",
        disabled: "Este campo esta deshabilitado"
    });

    /*
     |  Translator:     Noxludio - https://github.com/noxludio
     |  GitHub:         https://github.com/pytesNET/tail.select/pull/35
     */
    select.strings.register("fi", {
        all: "Kaikki",
        none: "Ei mitään",
        empty: "Ei vaihtoehtoja",
        emptySearch: "Etsimääsi vaihtoehtoa ei löytynyt",
        limit: "Muita vaihtoehtoja ei voi valita",
        placeholder: "Valitse...",
        placeholderMulti: "Valitse maksimissaan :limit...",
        search: "Hae tästä...",
        disabled: "Kenttä on poissa käytöstä"
    });

    /*
     |  Translator:     Anthony Rabine - (https://github.com/arabine)
     |  GitHub:         https://github.com/pytesNET/tail.select/issues/11
     */
    select.strings.register("fr", {
        all: "Tous",
        none: "Aucun",
        empty: "Aucune option disponible",
        emptySearch: "Aucune option trouvée",
        limit: "Aucune autre option sélectionnable",
        placeholder: "Choisissez une option...",
        placeholderMulti: "Choisissez jusqu'à :limit option(s)...",
        search: "Rechercher...",
        disabled: "Ce champs est désactivé"
    });

    /*
     |  Translator:     Alberto Vincenzi - (https://github.com/albertovincenzi)
     |  GitHub:         https://github.com/pytesNET/tail.select/issues/43
     */
    select.strings.register("it", {
        all: "Tutti",
        none: "Nessuno",
        empty: "Nessuna voce disponibile",
        emptySearch: "Nessuna voce trovata",
        limit: "Non puoi selezionare più Voci",
        placeholder: "Seleziona una Voce",
        placeholderMulti: "Selezione limitata a :limit Voci...",
        search: "Digita per cercare...",
        disabled: "Questo Campo è disabilitato"
    });

    /*
     |  Translator:     WoxVold - (https://github.com/woxvold)
     |  GitHub:         https://github.com/pytesNET/tail.select/issues/45
     */
    select.strings.register("no", {
        all: "Alle",
        none: "Ingen",
        empty: "Ingen valg tilgjengelig",
        emptySearch: "Ingen valg funnet",
        limit: "Du kan ikke velge flere",
        placeholder: "Velg...",
        placeholderMulti: "Velg opptil :limit...",
        search: "Søk...",
        disabled: "Dette feltet er deaktivert"
    });

    /*
     |  Translator:     Anthony Rabine - (https://github.com/arabine)
     |  GitHub:         https://github.com/pytesNET/tail.select/issues/11
     */
    select.strings.register("pt_BR", {
        all: "Todas",
        none: "Nenhuma",
        empty: "Nenhuma opção disponível",
        emptySearch: "Nenhuma opção encontrada",
        limit: "Não é possível selecionar outra opção",
        placeholder: "Escolha uma opção ...",
        placeholderMulti: "Escolha até: :limit opção(ões) ...",
        search: "Buscar ...",
        disabled: "Campo desativado"
    });

    /*
     |  Translator:     Roman Yepanchenko - (https://github.com/tizis)
     |  GitHub:         https://github.com/pytesNET/tail.select/issues/38
     */
    select.strings.register("ru", {
        all: "Все",
        none: "Ничего",
        empty: "Нет доступных вариантов",
        emptySearch: "Ничего не найдено",
        limit: "Вы не можете выбрать больше вариантов",
        placeholder: "Выберите вариант...",
        placeholderMulti: function(args){
            var strings = ["варианта", "вариантов", "вариантов"], cases = [2, 0, 1, 1, 1, 2], num = args[":limit"];
            var string = strings[(num%100 > 4 && num%100 < 20)? 2: cases[(num%10 < 5)? num%10: 5]];
            return "Выбор до :limit " + string + " ...";
        },
        search: "Начните набирать для поиска ...",
        disabled: "Поле отключено"
    });

    /*
     |  Translator:     Noxludio - https://github.com/noxludio
     |  GitHub:         https://github.com/pytesNET/tail.select/pull/35
     */
    select.strings.register("tr", {
        all: "Tümü",
        none: "Hiçbiri",
        empty: "Seçenek yok",
        emptySearch: "Seçenek bulunamadı",
        limit: "Daha fazla Seçenek seçemezsiniz",
        placeholder: "Bir Seçenek seçin...",
        placeholderMulti: "En fazla :limit Seçenek seçin...",
        search: "Aramak için yazın...",
        disabled: "Bu Alan kullanılamaz"
    });
    return select;
}));

}

Select.mTailSelect = mTailSelect;

mTailSelect.call(window);

//------------------------------------------------------------------------------
