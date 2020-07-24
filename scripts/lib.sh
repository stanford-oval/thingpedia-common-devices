#!/bin/bash

replace_config() {
sed \
  -e "s|@@JOB_NAME@@|${JOB_NAME}|g" \
  -e "s|@@OWNER@@|${OWNER}|g" \
  -e "s|@@IAM_ROLE@@|${IAM_ROLE}|g" \
  -e "s|@@IMAGE@@|${IMAGE}|g" \
  -e "s|@@cmdline@@|${cmdline}|g" \
  "$@"
}

check_config() {
  local key
  for key in $1 ; do
    if test -z "${!key}" ; then
      echo "Missing or empty configuration key ${key}" 1>&2
      exit 1
    fi
  done
}

parse_args() {
  local dollarzero argnames argspecs arg argspec argname argdefault argvalue ok
  dollarzero="$1"
  shift
  argspecs="$1"
  shift
  argnames=
  for argspec in $argspecs ; do
    case "$argspec" in
    *=*)
      argnames="$argnames "$(sed -E -e 's/^([^=]*)=(.*)$/\1/g' <<<"$argspec")
      ;;
    *)
      argnames="$argnames $argspec"
      ;;
    esac
  done
  n=0

  while test $# -gt 0 ; do
    arg=$1
    shift
    n=$((n+1))
    if test "$arg" = "--" ; then
      break
    fi
    ok=0
    if test "$arg" = "--help" || test "$arg" = "-h" ; then
      echo -n "Usage: $dollarzero" 1>&2
      for argname in $argnames ; do
        echo -n " --$argname <$argname>" 1>&2
      done
      echo
      exit 0
    fi
    for argname in $argnames ; do
      if test "$arg" = "--$argname" ; then
        argvalue=$1
        ok=1
        n=$((n+1))
        shift
        eval "$argname"='"$argvalue"'
        break
      fi
    done
    if test "$ok" = "0" ; then
      echo "Invalid command-line argument ${arg}" 1>&2
      exit 1
    fi
  done
  for argspec in $argspecs ; do
    case "$argspec" in
    *=*)
      argname=$(sed -E -e 's/^([^=]*)=(.*)$/\1/g' <<<"$argspec")
      argdefault=$(sed -E -e 's/^([^=]*)=(.*)$/\2/g' <<<"$argspec")
      ;;
    *)
      argname="$argspec"
      argdefault=""
      ;;
    esac

    if test -z "${!argname}" ; then
      if test -z "${argdefault}" ; then
        echo "Missing required command-line argument --${argname}" 1>&2
        exit 1
      else
        eval "$argname"='"$argdefault"'
      fi
    fi
  done
}

requote() {
  for arg ; do
    echo -n " \""$(sed 's/["\\]/\\\0/g' <<<"$arg")"\""
  done
}
