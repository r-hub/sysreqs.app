
# sysreqs(7) &mdash; Map System Requirements for R packages

## SYNOPSIS

### Summary:

`GET /`

### Querying records:

`GET /sysreq`  
`GET /sysreq/<id>`

`GET /platform`  
`GET /platform/<id>`

`GET /script`  
`GET /script/<id>`

`GET /override`__
`GET /override/<id>`

### Mapping strings:

`GET /map/<string>`  
`GET /map/platform/<platform>/<string>`  
`POST /map`  
`POST /map/platform/<platform>`

### Querying CRAN packages:

`GET /pkg/<package>`  
`GET /pkg/platform/<platform>/<package>`

## DESCRIPTION

**sysreqs** is a database of system requirements mappings for
installing and running R packages on various operating systems.

R packages may specify `SystemRequirements` in their `DESCRIPTION`
files to list software that must or should be installed on the
system to use the package. This is not a standardized field,
and various packages specify the same system requirements differently.

**sysreqs** is a hand-curated database of the `SystemRequirements`
entries, and their resolutions on various operating systems. The
data itself is stored in a GitHub repository, at
https://github.com/r-hub/sysreqs, and its public API is at
https://sysreqs.r-hub.org.

All endpoint responses (except for the `/` help page) are JSON
encoded.

## API

### Summary:

`GET /`  
TODO

### Querying records:

`GET /sysreq/list`  
TODO

`GET /sysreq/get/<id>`  
TODO

`GET /platform/list`  
TODO

`GET /platform/get/<id>`  
TODO

`GET /script/list`  
TODO

`GET /script/get/<id>`  
TODO

`GET /override`__
TODO

`GET /override/<id>`__
TODO

### Mapping strings:

`GET /map/<string>`  
TODO

`GET /map/platform/<platform>/<string>`  
TODO

`POST /map`  
TODO

`POST /map/platform/<platform>`  
TODO

### Querying CRAN packages:

`GET /pkg/<package>`  
TODO

`GET /pkg/platform/<platform>/<package>`  
TODO

## EXAMPLES

TODO

## CONTRIBUTIONS

You can contribute to **sysreqs** by
[reporting an issue](https://github.com/r-hub/sysreqsdb/issues),
or by [sending a pull request](https://github.com/r-hub/sysreqsdb).

## AUTHOR

**sysreqs** was concieved at the
[2015 rOpenSci Unconf](http://unconf.ropensci.org/). Most of
it was implemented by [Gábor Csárdi](https://github.com/gaborcsardi)
in the [r-hub](https://r-hub.org) project, funded by the
[R Consortium](https://www.r-consortium.org/).

## COPYRIGHT

**sysreqs** is Copyright (c) 2015-2019
[R Consortium](https://www.r-consortium.org/).

## SEE ALSO

See https://github.com/r-hub/sysreqs for the data format.

The node.js application that serves the API is available here:
https://github.com/r-hub/sysreqs.app.
