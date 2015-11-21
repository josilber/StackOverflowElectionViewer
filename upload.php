<?php

if (!array_key_exists("soUpload", $_FILES) ||
    !array_key_exists("msoUpload", $_FILES) ||
    !array_key_exists("mseUpload", $_FILES)) {
  exit("Unexpected files passed to upload code.");
}

function grabCSV($field, $extra) {
  $fname = $_FILES[$field]["tmp_name"];
  if ($fname === "") {
    if ($field == "soUpload" || $field == "msoUpload") {
      exit("Please provide a file for data from Stack Overflow and meta.so");
    }
    // No MSE account
    $arr = array("AnswerCountMSE" => "0",
		 "BronzeBadgesMSE" => "0",
		 "SilverBadgesMSE" => "0",
		 "GoldBadgesMSE" => "0",
		 "CommentCountMSE" => "0",
		 "QuestionCountMSE" => "0",
		 "ReputationMSE" => "101",  // Assume assoc bonus
		 "DiscussionScoreMSE" => "0",
		 "FeatureRequestScoreMSE" => "0",
		 "SupportScoreMSE" => "0",
		 "DownVotesMSE" => "0",
		 "UpVotesMSE" => "0",
		 "VotesMSE" => "0");
    return $arr;
  }
  $f = fopen($fname, "r");
  if ($f === FALSE) {
    exit("Internal error");
  }
  $header = fgetcsv($f, 1000, ",");
  if ($header === FALSE) {
    exit("Uploaded csv file should have a header");
  }

  foreach ($header as &$value) {
    $value = $value . $extra;
  }

  $data = fgetcsv($f, 1000, ",");
  if ($data === FALSE) {
    exit("Uploaded csv files should have a data row");
  }
  if (count($header) != count($data)) {
    exit("Uploaded csv file doesn't have same number of objects in header and data row");
  }
  $combined = array_combine($header, array_values($data));
  return $combined;
}

$soData = grabCSV("soUpload", "");
if (array_key_exists("Id", $soData)) {
  $soData["Id"] = $soData["Id"] . "000";
}
$msoData = grabCSV("msoUpload", "MSO");
if (array_key_exists("DisplayNameMSO", $msoData)) {
  unset($msoData["DisplayNameMSO"]);
}
$mseData = grabCSV("mseUpload", "MSE");
if (array_key_exists("DisplayNameMSE", $mseData)) {
  unset($mseData["DisplayNameMSE"]);
}
$fullData = array_merge($soData, $msoData, $mseData);

$newURL = "SOelection.html?u=" . rawurlencode(json_encode($fullData));
header('Location: ' . $newURL);
?>