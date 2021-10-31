import path from 'path'
import { promises as fs } from 'fs'

const regexp = /<<(.*?)>>|\{\{(.*?)\}\}/
class Sprightly {
  public fileContent: string[] = []
  public options: any = null
  public level: number = 0
  public directory: string = ''

  async parse(pFile: string) {
    const file = pFile.split('\n');
    this.fileContent = file; // register the current file content. Used in specifiying errors location
    for (let i = 0; i < file.length; i++) {
      this.level = i; // register the current level in file. Used in specifiying errors location
      for (let match = file[i].match(regexp), result; match;) {
        if (match[0][0] === '<') {
          this.directory = `${match[1].trim()}.${this.options.settings['view engine']}`; // register the current file. Used in specifiying errors location
          result = await this.read(path.join(this.options.settings.views, this.directory));
        } else {
          result = this.options[match[2].trim()];
        }
        file[i] = file[i].replace(match[0], result ? result : '');
        match = file[i].match(regexp);
      }
    }
    return file.join('');
  }
  async read(path: string) {
    const file = (await fs.readFile(path)).toString();
    return await this.parse(file);
  }
};

const sprightly = new Sprightly();

export default async (path: string, options: any, callback: Function) => {
  try {
    sprightly.options = options;
    callback(undefined, await sprightly.read(path));
  } catch (e) {
    console.log(e)
    const message = `Cannot find file or directory "${sprightly.directory}" inside the views directory
        ${sprightly.level - 1 >= 0 ? `${String(sprightly.level).padStart(4, '0')}| ${sprightly.fileContent[sprightly.level - 1]}` : ''}
    >>  ${String(sprightly.level + 1).padStart(4, '0')}| ${sprightly.fileContent[sprightly.level]}
        ${sprightly.level + 1 < sprightly.fileContent.length ? `${String(sprightly.level + 2).padStart(4, '0')}| ${sprightly.fileContent[sprightly.level + 1]}` : ''}`;
    callback(message);
  }
};


// MIT License

// Copyright (c) 2020 Obada Khalili

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
