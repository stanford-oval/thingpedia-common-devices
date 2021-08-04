#! /bin/bash

len_all=$(wc -l < $1)
len_split1=$(echo $len_all $4 | awk '{ printf "%d", $1 * $2 }')
len_split2=$((len_all - len_split1))

head -$len_split1 $1 > $2
tail -$len_split2 $1 > $3
