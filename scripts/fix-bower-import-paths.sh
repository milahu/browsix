#! /bin/sh

bower_absolute_path=$(readlink -f bower_components/)

find app/ app-spec/ examples/ -type f |
while read f
do

# src="/bower_components/
# src="../bower_components/

rel=$(realpath --relative-to="$(readlink -f "$f")" "$bower_absolute_path")

sed -i -E "s,\"(/|(\.\./)+)?bower_components,\"$rel,g" "$f"

#echo "$rel"
# example: ../../bower_components

done
