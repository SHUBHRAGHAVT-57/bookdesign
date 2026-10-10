import { Fragment, memo } from 'react';
import type { WordMap } from '../types';

interface SourcePassageProps {
  map: WordMap;
  /** Index of the word being typed, or -1 when nothing should be highlighted. */
  currentWord: number;
}

/** The left-page source text, with a soft marker on the word currently being typed. */
function SourcePassage({ map, currentWord }: SourcePassageProps) {
  return (
    <p className="prose source-text">
      {map.words.map((word, index) => (
        <Fragment key={index}>
          <span className={index === currentWord ? 'src-word is-current' : 'src-word'}>{word.text}</span>
          {index < map.words.length - 1 ? ' ' : ''}
        </Fragment>
      ))}
    </p>
  );
}

export default memo(SourcePassage);
