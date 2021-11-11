import './overlay.scss';

const overlayElement = document.createElement('div');
overlayElement.setAttribute('id', 'screen-overlay');
document.body.appendChild(overlayElement);

export default overlayElement;