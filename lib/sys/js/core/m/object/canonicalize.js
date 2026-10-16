function canonicalize(path)
{
  if(typeof path !== "string")
  {
    throw new TypeError("canonicalize: path must be a string");
  }

  // Parse quoted property names without evaluating JavaScript.
  function _readString(start)
  {
    const quote = path[start];
    let value = "";
    let index = start + 1;

    while(index < path.length)
    {
      const character = path[index++];

      if(character === quote)
      {
        return {value, index};
      }

      if(character !== "\\")
      {
        if(character === "\n" || character === "\r")
        {
          throw new SyntaxError("canonicalize: newline in quoted property");
        }

        value += character;
        continue;
      }

      if(index === path.length)
      {
        break;
      }

      const escape = path[index++];

      switch(escape)
      {
        case "0":
          if(/[0-9]/.test(path[index] ?? ""))
          {
            throw new SyntaxError("canonicalize: legacy octal escape");
          }
          value += "\0";
          break;

        case "b": value += "\b"; break;
        case "f": value += "\f"; break;
        case "n": value += "\n"; break;
        case "r": value += "\r"; break;
        case "t": value += "\t"; break;
        case "v": value += "\v"; break;

        case "x":
        {
          const hex = path.slice(index, index + 2);

          if(!/^[0-9a-fA-F]{2}$/.test(hex))
          {
            throw new SyntaxError("canonicalize: invalid hexadecimal escape");
          }

          value += String.fromCharCode(parseInt(hex, 16));
          index += 2;
          break;
        }

        case "u":
        {
          if(path[index] === "{")
          {
            const end = path.indexOf("}", index + 1);
            const hex = path.slice(index + 1, end);
            const point = Number.parseInt(hex, 16);

            if(end === -1 || !/^[0-9a-fA-F]+$/.test(hex) || point > 0x10ffff)
            {
              throw new SyntaxError("canonicalize: invalid Unicode escape");
            }

            value += String.fromCodePoint(point);
            index = end + 1;
          }
          else
          {
            const hex = path.slice(index, index + 4);

            if(!/^[0-9a-fA-F]{4}$/.test(hex))
            {
              throw new SyntaxError("canonicalize: invalid Unicode escape");
            }

            value += String.fromCharCode(parseInt(hex, 16));
            index += 4;
          }

          break;
        }

        case "\r":
          if(path[index] === "\n")
          {
            index++;
          }
          break;

        case "\n":
        case "\u2028":
        case "\u2029":
          break;

        default:
          if(escape >= "1" && escape <= "9")
          {
            throw new SyntaxError("canonicalize: legacy numeric escape");
          }

          value += escape;
      }
    }

    throw new SyntaxError("canonicalize: unterminated quoted property");
  }

  // Scan a balanced bracket expression while respecting quoted segments.
  function _findBracketEnd(start)
  {
    let depth = 0;
    let quote = null;
    let escaped = false;

    for(let index = start; index < path.length; index++)
    {
      const character = path[index];

      if(quote !== null)
      {
        if(escaped)
        {
          escaped = false;
        }
        else if(character === "\\")
        {
          escaped = true;
        }
        else if(character === quote)
        {
          quote = null;
        }
      }
      else if(character === "'" || character === '"' || character === "\x60")
      {
        quote = character;
      }
      else if(character === "[")
      {
        depth++;
      }
      else if(character === "]")
      {
        depth--;

        if(depth === 0)
        {
          return index + 1;
        }
      }
    }

    throw new SyntaxError("canonicalize: unterminated bracket expression");
  }

  let result = "";
  let index = 0;

  while(index < path.length)
  {
    if(path[index] === ".")
    {
      const start = ++index;

      while(index < path.length && path[index] !== "." && path[index] !== "[")
      {
        index++;
      }

      if(start === index)
      {
        throw new SyntaxError("canonicalize: empty property name");
      }

      result += "[" + JSON.stringify(path.slice(start, index)) + "]";
      continue;
    }

    if(path[index] !== "[")
    {
      throw new SyntaxError("canonicalize: expected '.' or '[' at index " + index);
    }

    const end = _findBracketEnd(index);
    const content = path.slice(index + 1, end - 1);

    if(content.trim() === "")
    {
      throw new SyntaxError("canonicalize: empty bracket expression");
    }

    const quoteStart = index + 1 + content.length - content.trimStart().length;

    if(path[quoteStart] === '"' || path[quoteStart] === "'")
    {
      const parsed = _readString(quoteStart);

      if(path.slice(parsed.index, end - 1).trim() === "")
      {
        result += "[" + JSON.stringify(parsed.value) + "]";
        index = end;
        continue;
      }
    }

    result += path.slice(index, end);
    index = end;
  }

  return result;
}
