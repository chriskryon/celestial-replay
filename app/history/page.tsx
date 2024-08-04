"use client";
import { useState, useEffect } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
} from "@nextui-org/table";
import { Calendar } from "@nextui-org/calendar";
import { Switch } from "@nextui-org/switch";
import { DateValue, toCalendarDate } from "@internationalized/date";

function StatisticsPage() {
  const today = new Date();
  const [playbackHistory, setPlaybackHistory] = useState<
    { url: string; count: number; lastPlayed: string }[]
  >([]);
  const [selectedDate, setSelectedDate] = useState<
    DateValue | null | undefined
  >(null);
  const [showTotalRepetitions, setShowTotalRepetitions] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedHistory = localStorage.getItem("celestial-stats");

      if (storedHistory) {
        setPlaybackHistory(JSON.parse(storedHistory));
      }
    }
  }, []);

  const filteredHistory = selectedDate
  ? playbackHistory.filter((item) => {
      const itemDate = new Date(item.lastPlayed);
      const selectedCalendarDate = toCalendarDate(selectedDate);
      const itemCalendarDate = toCalendarDate(itemDate); // Converter para CalendarDate

      return (
        itemCalendarDate.day === selectedCalendarDate.day &&
        itemCalendarDate.month === selectedCalendarDate.month && 
        itemCalendarDate.year === selectedCalendarDate.year
      );
    })
  : playbackHistory;


  const totalRepetitionsByUrl = playbackHistory.reduce(
    (acc, item) => {
      if (acc[item.url]) {
        acc[item.url]++;
      } else {
        acc[item.url] = 1;
      }

      return acc;
    },
    {} as { [url: string]: number },
  );

  // Monta os dados da tabela com base no estado do switch
  const tableData = showTotalRepetitions
    ? Object.entries(totalRepetitionsByUrl).map(([url, count]) => ({
        url,
        count,
      })) // URLs únicas com total de repetições
    : filteredHistory; // Histórico filtrado por data

  return (
    <div className="bg-[#27272A] rounded-md bg-opacity-70 p-5">
      <h1>History</h1>

      <div className="flex justify-center gap-x-4 mb-4">
        {/* <Calendar
          aria-label="Selecione uma data"
          value={selectedDate}
          onChange={(date) => setSelectedDate(date)}
          // maxValue={toCalendarDate(tod)}
        /> */}
      </div>

      {/* <Switch
        isSelected={showTotalRepetitions}
        onChange={() => setShowTotalRepetitions(!showTotalRepetitions)}
      >
        <div className="flex flex-col gap-1">
          <p className="text-medium">
            {showTotalRepetitions
              ? "Exibir Repetições Totais"
              : "Exibir Última Reprodução"}
          </p>
        </div>
      </Switch> */}

      <Table aria-label="Tabela de Histórico">
        <TableHeader>
          <TableColumn>URL</TableColumn>
          <TableColumn>Repetitions</TableColumn>
          <TableColumn>Última Reprodução</TableColumn>
        </TableHeader>
        <TableBody emptyContent={"No rows to display."}>
          {filteredHistory.map((item) => (
            <TableRow key={item.url}>
              <TableCell className="text-tiny truncate">{item.url}</TableCell>
              <TableCell>{totalRepetitionsByUrl[item.url]}</TableCell>
              <TableCell>
                {new Date(item.lastPlayed).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default StatisticsPage;
