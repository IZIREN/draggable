import {closest} from 'shared/utils';
import Sensor from './../Sensor';

import {
  DragStartSensorEvent,
  DragMoveSensorEvent,
  DragStopSensorEvent,
} from './../SensorEvent';

const onTouchStart = Symbol('onTouchStart');
const onTouchHold = Symbol('onTouchHold');
const onTouchEnd = Symbol('onTouchEnd');
const onTouchMove = Symbol('onTouchMove');
const onScroll = Symbol('onScroll');

/**
 * This sensor picks up native browser touch events and dictates drag operations
 * @class TouchSensor
 * @module TouchSensor
 * @extends Sensor
 */
export default class TouchSensor extends Sensor {

  /**
   * TouchSensor constructor.
   * @constructs TouchSensor
   * @param {HTMLElement[]|NodeList|HTMLElement} containers - Containers
   * @param {Object} options - Options
   */
  constructor(containers = [], options = {}) {
    super(containers, options);

    /**
     * Closest scrollable container
     * @property currentScrollableParent
     * @type {HTMLElement}
     */
    this.currentScrollableParent = null;

    this[onTouchStart] = this[onTouchStart].bind(this);
    this[onTouchHold] = this[onTouchHold].bind(this);
    this[onTouchEnd] = this[onTouchEnd].bind(this);
    this[onTouchMove] = this[onTouchMove].bind(this);
    this[onScroll] = this[onScroll].bind(this);
  }

  /**
   * Attaches sensors event listeners to the DOM
   */
  attach() {
    document.addEventListener('touchstart', this[onTouchStart], {passive: false});
  }

  /**
   * Detaches sensors event listeners to the DOM
   */
  detach() {
    document.removeEventListener('touchstart', this[onTouchStart], {passive: false});
  }

  [onScroll]() {
    // Cancel potential drag and allow scroll on iOS or other touch devices
    clearTimeout(this.tapTimeout);
  }

  [onTouchStart](event) {
    const container = closest(event.target, this.containers);

    if (!container) {
      return;
    }

    event.preventDefault();

    // detect if body is scrolling on iOS
    document.addEventListener('scroll', this[onScroll]);
    container.addEventListener('contextmenu', onContextMenu);

    this.currentContainer = container;

    this.currentScrollableParent = closest(container, (element) => element.offsetHeight < element.scrollHeight);

    if (this.currentScrollableParent) {
      this.currentScrollableParent.addEventListener('scroll', this[onScroll]);
    }

    this.tapTimeout = setTimeout(this[onTouchHold](event, container), this.options.delay);
  }

  [onTouchHold](event, container) {
    return () => {
      const touch = event.touches[0] || event.changedTouches[0];
      const target = event.target;

      const dragStartEvent = new DragStartSensorEvent({
        clientX: touch.pageX,
        clientY: touch.pageY,
        target,
        container,
        originalEvent: event,
      });

      this.trigger(container, dragStartEvent);

      this.currentContainer = container;
      this.dragging = !dragStartEvent.canceled();

      if (this.dragging) {
        document.addEventListener('touchend', this[onTouchEnd], {passive: false});
        document.addEventListener('touchcancel', this[onTouchEnd], {passive: false});
        document.addEventListener('touchmove', this[onTouchMove], {passive: false});
      }
    };
  }

  [onTouchMove](event) {
    if (!this.dragging) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();

    const touch = event.touches[0] || event.changedTouches[0];
    const target = document.elementFromPoint(touch.pageX - window.scrollX, touch.pageY - window.scrollY);

    const dragMoveEvent = new DragMoveSensorEvent({
      clientX: touch.pageX,
      clientY: touch.pageY,
      target,
      container: this.currentContainer,
      originalEvent: event,
    });

    this.trigger(this.currentContainer, dragMoveEvent);
  }

  [onTouchEnd](event) {
    if (!this.dragging) {
      return;
    }

    const container = event.currentTarget;

    document.removeEventListener('scroll', this[onScroll]);
    container.removeEventListener('contextmenu', onContextMenu);

    if (this.currentScrollableParent) {
      this.currentScrollableParent.removeEventListener('scroll', this[onScroll]);
    }

    clearTimeout(this.tapTimeout);

    if (!this.dragging) {
      return;
    }

    const touch = event.touches[0] || event.changedTouches[0];

    event.preventDefault();

    const dragStopEvent = new DragStopSensorEvent({
      clientX: touch.pageX,
      clientY: touch.pageY,
      target: null,
      container: this.currentContainer,
      originalEvent: event,
    });

    this.trigger(this.currentContainer, dragStopEvent);

    document.removeEventListener('touchend', this[onTouchEnd], {passive: false});
    document.removeEventListener('touchcancel', this[onTouchEnd], {passive: false});
    document.removeEventListener('touchmove', this[onTouchMove], {passive: false});

    this.currentContainer = null;
    this.dragging = false;
  }
}

function onContextMenu(event) {
  event.preventDefault();
}
