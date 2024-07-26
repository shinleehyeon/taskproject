import React, { useState } from "react";
import { FiPlus, FiTrash } from "react-icons/fi";
import { motion } from "framer-motion";
import { FaFire } from "react-icons/fa";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

const COLOR_PALETTE = [
  { name: "Gray", className: "text-neutral-500" },
  { name: "Yellow", className: "text-yellow-200" },
  { name: "Blue", className: "text-blue-200" },
  { name: "Green", className: "text-emerald-200" },
  { name: "Red", className: "text-red-200" },
  { name: "Purple", className: "text-violet-200" },
];

export const CustomKanban = () => {
  return (
    <div className="h-screen w-full bg-neutral-900 text-neutral-50">
      <Board />
    </div>
  );
};

const Board = () => {
  const [cards, setCards] = useState([]);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);

  const addColumn = () => {
    const newColumn = {
      id: Math.random().toString(),
      title: "New Column",
      headingColor: "text-neutral-400",
    };
    setColumns([...columns, newColumn]);
  };

  const updateColumnTitle = (id, newTitle) => {
    setColumns(columns.map(column => column.id === id ? { ...column, title: newTitle } : column));
  };

  const updateColumnColor = (id, newColor) => {
    setColumns(columns.map(column => column.id === id ? { ...column, headingColor: newColor } : column));
  };

  const removeColumn = (id) => {
    setColumns(columns.filter(column => column.id !== id));
    setCards(cards.filter(card => card.column !== id));
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    if (result.type === "COLUMN") {
      const reorderedColumns = [...columns];
      const [removed] = reorderedColumns.splice(result.source.index, 1);

      // Check if the column is dragged to the burn barrel
      if (result.destination.droppableId === "burnBarrel") {
        removeColumn(removed.id);
      } else {
        reorderedColumns.splice(result.destination.index, 0, removed);
        setColumns(reorderedColumns);
      }
    } else {
      // Handle card reordering if necessary
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="board" type="COLUMN" direction="horizontal">
        {(provided) => (
          <div
            className="flex h-full w-full gap-6 overflow-x-scroll p-12"
            {...provided.droppableProps}
            ref={provided.innerRef}
          >
            {columns.map((column, index) => (
              <Draggable key={column.id} draggableId={column.id} index={index}>
                {(provided) => (
                  <div
                    className="w-56 shrink-0"
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                  >
                    <Column
                      id={column.id}
                      title={column.title}
                      headingColor={column.headingColor}
                      cards={cards}
                      setCards={setCards}
                      updateColumnTitle={updateColumnTitle}
                      updateColumnColor={updateColumnColor}
                      removeColumn={removeColumn}
                      dragHandleProps={provided.dragHandleProps}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            <div className="flex flex-col items-center">
              <button
                onClick={addColumn}
                className="mt-10 flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 transition-colors hover:text-neutral-50"
              >
                <span>Add Column</span>
                <FiPlus />
              </button>
              <Droppable droppableId="burnBarrel" type="COLUMN">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}>
                    <BurnBarrel setCards={setCards} />
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

const Column = ({
  id,
  title,
  headingColor,
  cards,
  column,
  setCards,
  updateColumnTitle,
  updateColumnColor,
  removeColumn,
  dragHandleProps
}) => {
  const [active, setActive] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState(title);

  const handleDragStart = (e, card) => {
    e.dataTransfer.setData("cardId", card.id);
  };

  const handleDragEnd = (e) => {
    const cardId = e.dataTransfer.getData("cardId");

    setActive(false);
    clearHighlights();

    const indicators = getIndicators();
    const { element } = getNearestIndicator(e, indicators);

    const before = element.dataset.before || "-1";

    if (before !== cardId) {
      let copy = [...cards];

      let cardToTransfer = copy.find((c) => c.id === cardId);
      if (!cardToTransfer) return;
      cardToTransfer = { ...cardToTransfer, column: id };

      copy = copy.filter((c) => c.id !== cardId);

      const moveToBack = before === "-1";

      if (moveToBack) {
        copy.push(cardToTransfer);
      } else {
        const insertAtIndex = copy.findIndex((el) => el.id === before);
        if (insertAtIndex === undefined) return;

        copy.splice(insertAtIndex, 0, cardToTransfer);
      }

      setCards(copy);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    highlightIndicator(e);

    setActive(true);
  };

  const clearHighlights = (els) => {
    const indicators = els || getIndicators();

    indicators.forEach((i) => {
      i.style.opacity = "0";
    });
  };

  const highlightIndicator = (e) => {
    const indicators = getIndicators();

    clearHighlights(indicators);

    const el = getNearestIndicator(e, indicators);

    el.element.style.opacity = "1";
  };

  const getNearestIndicator = (e, indicators) => {
    const DISTANCE_OFFSET = 50;

    const el = indicators.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();

        const offset = e.clientY - (box.top + DISTANCE_OFFSET);

        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      {
        offset: Number.NEGATIVE_INFINITY,
        element: indicators[indicators.length - 1],
      }
    );

    return el;
  };

  const getIndicators = () => {
    return Array.from(document.querySelectorAll(`[data-column="${id}"]`));
  };

  const handleDragLeave = () => {
    clearHighlights();
    setActive(false);
  };

  const filteredCards = cards.filter((c) => c.column === id);

  const handleTitleChange = () => {
    updateColumnTitle(id, newTitle);
    setIsEditing(false);
  };

  return (
    <div className="w-56 shrink-0">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center" {...dragHandleProps}>
          {isEditing ? (
            <input
              className="bg-neutral-800 text-neutral-50 border-b focus:outline-none"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onBlur={handleTitleChange}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleChange()}
              autoFocus
            />
          ) : (
            <div className="flex items-center">
              <h3
                className={`font-medium ${headingColor} cursor-pointer`}
                onClick={() => setIsEditing(true)}
              >
                {title}
              </h3>
              <ColorPicker columnId={id} updateColumnColor={updateColumnColor} />
            </div>
          )}
        </div>
        <span className="rounded text-sm text-neutral-400">
          {filteredCards.length}
        </span>
        <button onClick={() => removeColumn(id)} className="text-neutral-400 hover:text-red-500 ml-2">
          <FiTrash />
        </button>
      </div>
      <div
        onDrop={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`h-full w-full transition-colors ${
          active ? "bg-neutral-800/50" : "bg-neutral-800/0"
        }`}
      >
        {filteredCards.map((c) => {
          return <Card key={c.id} {...c} handleDragStart={handleDragStart} />;
        })}
        <DropIndicator beforeId={null} column={id} />
        <AddCard column={id} setCards={setCards} />
      </div>
    </div>
  );
};

const ColorPicker = ({ columnId, updateColumnColor }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleColorChange = (colorClass) => {
    updateColumnColor(columnId, colorClass);
    setIsOpen(false);
  };

  return (
    <div className="relative ml-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-neutral-400 hover:text-neutral-50"
      >
        &#x25BC;
      </button>
      {isOpen && (
        <div className="absolute mt-1 w-24 bg-neutral-800 border border-neutral-700 rounded shadow-lg z-10">
          {COLOR_PALETTE.map((color) => (
            <div
              key={color.name}
              className={`cursor-pointer p-2 ${color.className} hover:bg-neutral-700`}
              onClick={() => handleColorChange(color.className)}
            >
              {color.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Card = ({ title, id, column, handleDragStart }) => {
  return (
    <>
      <DropIndicator beforeId={id} column={column} />
      <motion.div
        layout
        layoutId={id}
        draggable="true"
        onDragStart={(e) => handleDragStart(e, { title, id, column })}
        className="cursor-grab rounded border border-neutral-700 bg-neutral-800 p-3 active:cursor-grabbing"
      >
        <p className="text-sm text-neutral-100">{title}</p>
      </motion.div>
    </>
  );
};

const DropIndicator = ({ beforeId, column }) => {
  return (
    <div
      data-before={beforeId || "-1"}
      data-column={column}
      className="my-0.5 h-0.5 w-full bg-violet-400 opacity-0"
    />
  );
};

const BurnBarrel = ({ setCards }) => {
  const [active, setActive] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setActive(true);
  };

  const handleDragLeave = () => {
    setActive(false);
  };

  const handleDragEnd = (e) => {
    const cardId = e.dataTransfer.getData("cardId");

    setCards((pv) => pv.filter((c) => c.id !== cardId));

    setActive(false);
  };

  return (
    <div
      onDrop={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`mt-10 grid h-56 w-56 shrink-0 place-content-center rounded border text-3xl ${
        active
          ? "border-red-800 bg-red-800/20 text-red-500"
          : "border-neutral-500 bg-neutral-500/20 text-neutral-500"
      }`}
    >
      {active ? <FaFire className="animate-bounce" /> : <FiTrash />}
    </div>
  );
};

const AddCard = ({ column, setCards }) => {
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!text.trim().length) return;

    const newCard = {
      column,
      title: text.trim(),
      id: Math.random().toString(),
    };

    setCards((pv) => [...pv, newCard]);

    setAdding(false);
  };

  return (
    <>
      {adding ? (
        <motion.form layout onSubmit={handleSubmit}>
          <textarea
            onChange={(e) => setText(e.target.value)}
            autoFocus
            placeholder="Add new task..."
            className="w-full rounded border border-violet-400 bg-violet-400/20 p-3 text-sm text-neutral-50 placeholder-violet-300 focus:outline-0"
          />
          <div className="mt-1.5 flex items-center justify-end gap-1.5">
            <button
              onClick={() => setAdding(false)}
              className="px-3 py-1.5 text-xs text-neutral-400 transition-colors hover:text-neutral-50"
            >
              Close
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded bg-neutral-50 px-3 py-1.5 text-xs text-neutral-950 transition-colors hover:bg-neutral-300"
            >
              <span>Add</span>
              <FiPlus />
            </button>
          </div>
        </motion.form>
      ) : (
        <motion.button
          layout
          onClick={() => setAdding(true)}
          className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 transition-colors hover:text-neutral-50"
        >
          <span>Add card</span>
          <FiPlus />
        </motion.button>
      )}
    </>
  );
};

const DEFAULT_COLUMNS = [
  { id: "backlog", title: "Backlog", headingColor: "text-neutral-500" },
  { id: "todo", title: "TODO", headingColor: "text-yellow-200" },
  { id: "doing", title: "In progress", headingColor: "text-blue-200" },
  { id: "done", title: "Complete", headingColor: "text-emerald-200" },
];
