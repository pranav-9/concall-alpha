const injectStyles = () => {
    const e = document.querySelector("style[fs-components-cloak]");
    e?.remove();
    const s = document.createElement("style");
    s.setAttribute("fs-components-cloak", "cloak"),
      (s.textContent =
        '\n     [fs-marquee-instance],[fs-cnumbercount-instance]{ opacity: 0; }\n    [fs-consent-element="internal-component"],[fs-consent-element="banner"],[fs-consent-element="fixed-preferences"],[fs-consent-element="preferences"],[fs-consent-element="interaction"]{display:none}\n '),
      document.head.appendChild(s);
  },
  initFsComponents = async (e) => {
    injectStyles();
    const s = window?.finsweetComponentsConfigLoading,
      n = document?.querySelector("script[fs-components-src]");
    if (void 0 !== import.meta && !n && !s) {
      document?.querySelector(
        'script[finsweet="components"][async][type="module"]'
      );
      const s = await import(import.meta.url),
        n = Object.keys(s) || [];
      return new Promise((s, t) => {
        const i = document.createElement("script"),
          o = e + "?v=" + new Date().getTime();
        (i.src = o),
          (i.type = "module"),
          (i.async = !0),
          i.setAttribute("fs-components-src", import.meta.url),
          i.setAttribute("fs-components-installed", n?.join(",")),
          (i.onload = () => s()),
          (i.onerror = () => t(new Error("Failed to load script"))),
          document.head.appendChild(i);
      });
    }
  };
initFsComponents(
  "https://cdn.jsdelivr.net/npm/@finsweet/fs-components@2/fs-components.js"
);
export const slider = {
  "fs-slider-instance='fs-slider'": {
    slideActiveClass: "is-slide-active",
    slideNextClass: "is-slide-next",
    slidePrevClass: "is-slide-previous",
    direction: "horizontal",
    loop: !1,
    autoHeight: !1,
    allowTouchMove: !0,
    centeredSlides: !1,
    slideToClickedSlide: !1,
    initialSlide: 0,
    speed: 300,
    followFinger: !0,
    keyboard: !1,
    mousewheel: !1,
    effect: "slide",
    pagination: {
      el: "[fs-slider-instance='fs-slider'] [fs-slider-element='pagination']",
      type: "bullets",
      bulletElement: "div",
      bulletActiveClass: "is-bullet-active",
      clickable: !0,
    },
    navigation: {
      prevEl: "[fs-slider-instance='fs-slider'] [fs-slider-element='previous']",
      nextEl: "[fs-slider-instance='fs-slider'] [fs-slider-element='next']",
      hideOnClick: !1,
      disabledClass: "is-nav-disabled",
    },
    breakpoints: {
      320: { slidesPerView: 1, slidesPerGroup: 1, spaceBetween: 16 },
      991: { slidesPerView: 1, slidesPerGroup: 1, spaceBetween: 16 },
    },
    fscomponentclass: "fs-slider",
    fscomponentinstance: "fs-slider",
    fscomponentname: "Slider",
    fscomponentlastupdate: "October 21, 2025, 9:55AM",
  },
};
