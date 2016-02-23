
# sysreqs(7) &mdash; Map SystemRequirements for R packages

## SYNOPSIS

`GET /`  
`GET /get`/<mapping>  
`GET /list`  
`GET /map`/<string>  
`GET /populate`  
`GET /pkg`/<package>[`/`<os>]

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

* `GET /`  
   This page.

* `GET /get` / <mapping>  
  Retrieve a complete mapping entry by its name.

* `GET /list`  
  List all mapping entries.

* `GET /map` / <string>  
  Map a `SystemRequirements` field to canonical entries. It returns a list
  of full entries. <string> may contains arbitrary characters, but potentially
  it has to be URL encoded.

* `GET /populate`  
  Refresh the database from the `r-hub/sysreqs` repository
  at GitHub.

* `GET /pkg` / <package>  
  Map a single R packge, potentially on a single operating system.
  <package> must be a single CRAN package.

* `GET /pkg` / <package>  / <os>   
  Get the operating system specific packages that are needed for a CRAN package.

## EXAMPLES

httr::GET("[http://sysreqs.r-hub.org/get/fftw3](/get/fftw3)")  
httr::GET("[http://sysreqs.r-hub.org/get/python-2.7](/get/python-2.7)")  

httr::GET("[http://sysreqs.r-hub.org/list](/list)")  

httr::GET("[http://sysreqs.r-hub.org/map/Python%20(>=2.76)](/map/Python%20(>=2.76%29)")  
httr::GET("[http://sysreqs.r-hub.org/map/GNU make](/map/GNU make)")

httr::GET("[http://sysreqs.r-hub.org/pkg/igraph](/pkg/igraph)")  
httr::GET("[http://sysreqs.r-hub.org/pkg/openssl](/pkg/openssl)")

## CONTRIBUTIONS

You can contribute to **sysreqs** by
[reporting an issue](https://github.com/r-hub/sysreqs/issues),
or by [sending a pull request](https://github.com/r-hub/sysreqs).

## AUTHOR

**sysreqs** was concieved at the
[2015 rOpenSci Unconf](http://unconf.ropensci.org/). Most of
it was implemented by [Gábor Csárdi](https://github.com/gaborcsardi)
in the [r-hub](https://r-hub.org) project, funded by the
[R Consortium](https://www.r-consortium.org/).

## COPYRIGHT

**sysreqs** is Copyright (c) 2015-2016
[R Consortium](https://www.r-consortium.org/).

## SEE ALSO

See https://github.com/r-hub/sysreqs for the data format.

The node.js application that serves the API is available here:
https://github.com/r-hub/sysreqs.app.
