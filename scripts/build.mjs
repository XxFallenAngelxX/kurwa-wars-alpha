import {build} from './engine-build.mjs';
import {writeReleaseVersion} from './release-version.mjs';
console.log('Engine built:',build());
writeReleaseVersion();
