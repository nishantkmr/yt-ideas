import {registerRoot} from 'remotion';
import {RemotionRoot} from './Root';
// Shared styling. Each pack imports its own stylesheet from its components, so
// a video family's theme arrives with the components that need it.
import './styles/tokens.css';
import './styles/base.css';

registerRoot(RemotionRoot);
